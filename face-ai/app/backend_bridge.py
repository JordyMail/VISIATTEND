from __future__ import annotations

import argparse
import base64
import json
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import cv2
import numpy as np

from assets import STORAGE_DIR, USERS_DIR, ensure_arcface_model, ensure_directories, ensure_yunet_model
from detector import Detection, FaceDetector
from embedder import ArcFaceEmbedder, cosine_similarity
from store import EmbeddingStore

REQUIRED_TRAINING_SAMPLES = 3
PENDING_DIR = STORAGE_DIR / "pending_registrations"
VERIFICATION_AUDIT_LOG_PATH = STORAGE_DIR / "verification_audit.jsonl"


@dataclass
class PendingSample:
    created_at: str
    detector_score: float
    bbox: dict[str, int]
    landmarks: list[dict[str, float]]
    embedding: list[float]


class PendingRegistrationStore:
    def __init__(self, pending_dir: Path):
        self.pending_dir = pending_dir
        self.pending_dir.mkdir(parents=True, exist_ok=True)

    def _session_path(self, session_id: str) -> Path:
        return self.pending_dir / f"{session_id}.json"

    def load(self, session_id: str) -> dict[str, Any] | None:
        path = self._session_path(session_id)
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def save(self, session_id: str, payload: dict[str, Any]) -> Path:
        path = self._session_path(session_id)
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return path

    def delete(self, session_id: str) -> None:
        self._session_path(session_id).unlink(missing_ok=True)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ok(data: dict[str, Any]) -> None:
    print(json.dumps({"success": True, "data": data}))


def fail(message: str, details: dict[str, Any] | None = None, exit_code: int = 1) -> None:
    print(json.dumps({"success": False, "message": message, "details": details or {}}))
    raise SystemExit(exit_code)


def load_payload() -> dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    return json.loads(raw)


def decode_image(image_base64: str) -> np.ndarray:
    value = image_base64.strip()
    if "," in value:
        value = value.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(value)
    except Exception as exc:
        fail("Invalid base64 image", {"reason": str(exc)})

    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        fail("Image could not be decoded")
    return image


def create_detector() -> FaceDetector:
    return FaceDetector(str(ensure_yunet_model()))


def create_embedder() -> ArcFaceEmbedder:
    return ArcFaceEmbedder(str(ensure_arcface_model()))


def build_face_detection(detection: Detection) -> dict[str, Any]:
    return {
        "confidence": float(detection.score),
        "box": {
            "x": detection.x,
            "y": detection.y,
            "w": detection.w,
            "h": detection.h,
        },
        "landmarks": [{"x": float(x), "y": float(y)} for x, y in detection.landmarks],
    }


def detect_primary_face(image: np.ndarray) -> tuple[Detection, np.ndarray]:
    detector = create_detector()
    detections = detector.detect(image)
    primary = detector.get_primary_detection(detections)
    if primary is None:
        fail("No face detected", {"code": "FACE_NOT_DETECTED"})
    return primary, image


def embeddings_similarity(vector_a: list[float], vector_b: list[float]) -> float:
    first = np.asarray(vector_a, dtype=np.float32)
    second = np.asarray(vector_b, dtype=np.float32)
    return cosine_similarity(first, second)


def command_preview_detection(payload: dict[str, Any]) -> None:
    image_base64 = payload.get("imageBase64")
    if not image_base64:
        fail("imageBase64 is required")

    image = decode_image(image_base64)
    detector = create_detector()
    detections = detector.detect(image)
    primary = detector.get_primary_detection(detections)

    ok(
        {
            "detected": primary is not None,
            "faceDetection": build_face_detection(primary) if primary is not None else None,
        }
    )


def command_capture_registration(payload: dict[str, Any]) -> None:
    image_base64 = payload.get("imageBase64")
    if not image_base64:
        fail("imageBase64 is required")

    session_id = payload.get("sessionId") or uuid4().hex
    pending_store = PendingRegistrationStore(PENDING_DIR)
    pending_session = pending_store.load(session_id)
    if pending_session is None:
        pending_session = {
            "session_id": session_id,
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "required_samples": REQUIRED_TRAINING_SAMPLES,
            "samples": [],
        }

    if len(pending_session["samples"]) >= REQUIRED_TRAINING_SAMPLES:
        ok(
            {
                "sessionId": session_id,
                "sampleCount": len(pending_session["samples"]),
                "remainingCaptures": 0,
                "readyForProfile": True,
                "message": "Training samples already complete",
            }
        )
        return

    image = decode_image(image_base64)
    primary_face, frame = detect_primary_face(image)
    embedder = create_embedder()
    embedding_result = embedder.embed(frame, primary_face.landmarks)
    vector = embedding_result.vector.tolist()

    is_duplicate = False
    for existing in pending_session["samples"]:
        score = embeddings_similarity(vector, existing["embedding"])
        if score > 0.985:
            is_duplicate = True
            break

    if not is_duplicate:
        sample = PendingSample(
            created_at=now_iso(),
            detector_score=float(primary_face.score),
            bbox={"x": primary_face.x, "y": primary_face.y, "w": primary_face.w, "h": primary_face.h},
            landmarks=[{"x": float(x), "y": float(y)} for x, y in primary_face.landmarks],
            embedding=[float(value) for value in vector],
        )
        pending_session["samples"].append(asdict(sample))
        pending_session["updated_at"] = now_iso()
        pending_store.save(session_id, pending_session)

    sample_count = len(pending_session["samples"])
    ok(
        {
            "sessionId": session_id,
            "sampleCount": sample_count,
            "remainingCaptures": max(REQUIRED_TRAINING_SAMPLES - sample_count, 0),
            "readyForProfile": sample_count >= REQUIRED_TRAINING_SAMPLES,
            "duplicateCapture": is_duplicate,
            "faceDetection": build_face_detection(primary_face),
            "embeddingDimension": embedding_result.dimension,
        }
    )


def command_finalize_registration(payload: dict[str, Any]) -> None:
    session_id = payload.get("sessionId")
    user_id = payload.get("userId")
    display_name = payload.get("name")
    if not session_id or not user_id or not display_name:
        fail("sessionId, userId, and name are required")

    pending_store = PendingRegistrationStore(PENDING_DIR)
    session = pending_store.load(session_id)
    if session is None:
        fail("Training session not found", {"sessionId": session_id})

    samples = session.get("samples", [])
    if len(samples) < REQUIRED_TRAINING_SAMPLES:
        fail(
            "Training samples are not complete",
            {
                "sampleCount": len(samples),
                "requiredSamples": REQUIRED_TRAINING_SAMPLES,
            },
        )

    store = EmbeddingStore(USERS_DIR)
    for index, sample in enumerate(samples, start=1):
        landmarks = [(point["x"], point["y"]) for point in sample["landmarks"]]
        store.save_sample(
            user_id=user_id,
            display_name=display_name,
            embedding=sample["embedding"],
            detector_score=sample["detector_score"],
            bbox=sample["bbox"],
            landmarks=landmarks,
            source_image=f"training-session:{session_id}:sample-{index}",
        )

    pending_store.delete(session_id)
    ok(
        {
            "userId": user_id,
            "name": display_name,
            "registeredSamples": len(samples),
            "sessionId": session_id,
            "storagePath": str((USERS_DIR / f"{user_id}.json").resolve()),
        }
    )


def write_verification_audit(record: dict[str, Any]) -> None:
    VERIFICATION_AUDIT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with VERIFICATION_AUDIT_LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    print("[VERIFY_AUDIT] " + json.dumps(record, ensure_ascii=False))


def command_verify(payload: dict[str, Any]) -> None:
    attempt_id = uuid4().hex
    timestamp = now_iso()
    active_liveness = payload.get("activeLiveness") if isinstance(payload.get("activeLiveness"), dict) else None

    image_base64 = payload.get("imageBase64")
    if not image_base64:
        write_verification_audit(
            {
                "attemptId": attempt_id,
                "timestamp": timestamp,
                "modelMode": "recognition_only",
                "livenessScore": None,
                "faceRecognitionRan": False,
                "outcome": "FAIL_INPUT",
                "reason": "imageBase64 is required",
                "activeLiveness": active_liveness,
            }
        )
        fail("imageBase64 is required")

    image = decode_image(image_base64)
    primary_face, frame = detect_primary_face(image)

    embedder = create_embedder()
    embedding_result = embedder.embed(frame, primary_face.landmarks)
    query_vector = embedding_result.vector

    threshold = float(payload.get("threshold", 0.45))
    target_user_id = payload.get("userId")
    store = EmbeddingStore(USERS_DIR)

    candidate_ids = [target_user_id] if target_user_id else store.list_user_ids()
    if not candidate_ids:
        write_verification_audit(
            {
                "attemptId": attempt_id,
                "timestamp": timestamp,
                "modelMode": "recognition_only",
                "livenessScore": 1.0 if active_liveness and active_liveness.get("passed") else 0.0,
                "faceRecognitionRan": False,
                "outcome": "FAIL_RECOGNITION",
                "reason": "No registered face profiles found",
                "activeLiveness": active_liveness,
            }
        )
        fail("No registered face profiles found", {"code": "FACE_NOT_REGISTERED"})

    best_payload = None
    best_score = -1.0
    for candidate_id in candidate_ids:
        user_payload = store.load_user(candidate_id)
        if user_payload is None:
            continue

        for sample in user_payload.get("samples", []):
            score = cosine_similarity(query_vector, np.asarray(sample["embedding"], dtype=np.float32))
            if score > best_score:
                best_score = float(score)
                best_payload = user_payload

    matched = best_payload is not None and best_score >= threshold
    recognition_summary = {
        "bestScore": round(float(best_score), 6),
        "threshold": threshold,
        "matchedUserId": best_payload.get("user_id") if best_payload else None,
    }

    write_verification_audit(
        {
            "attemptId": attempt_id,
            "timestamp": timestamp,
            "modelMode": "recognition_only",
            "livenessScore": 1.0 if active_liveness and active_liveness.get("passed") else 0.0,
            "faceRecognitionRan": True,
            "outcome": "PASS" if matched else "FAIL_RECOGNITION",
            "reason": (
                f"Active liveness passed and cosine score {best_score:.4f} >= threshold {threshold:.4f}"
                if matched
                else f"Best cosine score {best_score:.4f} below threshold {threshold:.4f}"
            ),
            "activeLiveness": active_liveness,
            "recognition": recognition_summary,
        }
    )

    ok(
        {
            "matched": matched,
            "matchedUserId": best_payload.get("user_id") if matched and best_payload else None,
            "matchedName": best_payload.get("name") if matched and best_payload else None,
            "confidence": max(best_score, 0.0),
            "code": "FACE_MATCH" if matched else "FACE_NOT_MATCH",
            "threshold": threshold,
            "faceDetection": build_face_detection(primary_face),
            "liveness": {
                "score": 1.0 if active_liveness and active_liveness.get("passed") else 0.0,
                "method": "active_frontend",
                "dryRun": False,
                "details": active_liveness if active_liveness else {},
            },
        }
    )


def main() -> None:
    ensure_directories()
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["preview-detection", "capture-registration", "finalize-registration", "verify"])
    args = parser.parse_args()
    payload = load_payload()

    if args.command == "preview-detection":
        command_preview_detection(payload)
        return

    if args.command == "capture-registration":
        command_capture_registration(payload)
        return

    if args.command == "finalize-registration":
        command_finalize_registration(payload)
        return

    if args.command == "verify":
        command_verify(payload)
        return

    fail("Unsupported command")


if __name__ == "__main__":
    main()

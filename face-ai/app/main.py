import argparse
import re
from pathlib import Path

import cv2
import numpy as np

from assets import (
    ATTENDANCE_LOG_PATH,
    USERS_DIR,
    ensure_arcface_model,
    ensure_directories,
    ensure_yunet_model,
    setup_models,
)
from detector import FaceDetector
from embedder import ArcFaceEmbedder, cosine_similarity
from store import AttendanceLogStore, EmbeddingStore


def load_image(image_path: str) -> np.ndarray:
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Image not found or unreadable: {image_path}")
    return image


def create_detector() -> FaceDetector:
    return FaceDetector(str(ensure_yunet_model()))


def prompt_non_empty(label: str) -> str:
    while True:
        value = input(label).strip()
        if value:
            return value
        print("Input tidak boleh kosong.")


def make_user_id(display_name: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "-", display_name.upper()).strip("-")
    return normalized or "USER"


def capture_face_from_webcam(detector: FaceDetector, title: str, instruction: str) -> tuple[np.ndarray, list]:
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Webcam could not be opened")

    print(instruction)
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                raise RuntimeError("Failed to read frame from webcam")

            detections = detector.detect(frame)
            preview = detector.draw(frame, detections, primary_only=True)
            cv2.putText(
                preview,
                "Press C to capture | Q to cancel",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2,
            )
            cv2.imshow(title, preview)
            key = cv2.waitKey(1) & 0xFF

            if key == ord("q"):
                raise RuntimeError("Operation cancelled from webcam window")

            if key == ord("c"):
                if not detections:
                    print("Belum ada wajah terdeteksi. Arahkan wajah ke kamera lalu coba lagi.")
                    continue
                if len(detections) > 1:
                    print("Terdeteksi lebih dari satu wajah. Sistem akan memakai bounding box terbesar saja.")
                return frame.copy(), detections
    finally:
        cap.release()
        cv2.destroyAllWindows()


def run_detect(image_path: str, output_path: str) -> None:
    detector = create_detector()
    image = load_image(image_path)

    detections = detector.detect(image)
    result = detector.draw(image, detections)

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(output_path, result)

    print(f"Detected faces: {len(detections)}")
    for index, detection in enumerate(detections, start=1):
        print(
            f"  face-{index}: bbox=({detection.x},{detection.y},{detection.w},{detection.h}) "
            f"score={detection.score:.4f}"
        )
    print(f"Saved result to: {output_path}")


def run_webcam() -> None:
    detector = create_detector()
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        raise RuntimeError("Webcam could not be opened")

    print("Press q to quit")

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        detections = detector.detect(frame)
        preview = detector.draw(frame, detections, primary_only=True)
        if len(detections) > 1:
            cv2.putText(
                preview,
                "Multiple faces detected: using largest face",
                (10, 60),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 255),
                2,
            )

        cv2.imshow("OpenCV Face Detection", preview)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


def run_enroll(user_id: str, image_path: str, output_path: str | None, display_name: str | None = None) -> None:
    ensure_directories()
    detector = create_detector()
    embedder = ArcFaceEmbedder(str(ensure_arcface_model()))
    store = EmbeddingStore(USERS_DIR)
    image = load_image(image_path)

    detections = detector.detect(image)
    if not detections:
        raise RuntimeError("No face detected for enrollment")

    best_face = detections[0]
    embedding_result = embedder.embed(image, best_face.landmarks)
    output_file = store.save_sample(
        user_id=user_id,
        display_name=display_name,
        embedding=embedding_result.vector.tolist(),
        detector_score=best_face.score,
        bbox={"x": best_face.x, "y": best_face.y, "w": best_face.w, "h": best_face.h},
        landmarks=best_face.landmarks,
        source_image=image_path,
    )

    if output_path:
        annotated = detector.draw(image, detections, primary_only=True)
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(output_path, annotated)
        print(f"Saved annotated image to: {output_path}")

    print(f"Enrolled user: {user_id}")
    if display_name:
        print(f"Name: {display_name}")
    print(f"Embedding dimension: {embedding_result.dimension}")
    print(f"Detector score: {best_face.score:.4f}")
    print(f"User vector store: {output_file}")


def run_register_camera(user_id: str | None, display_name: str | None, output_path: str | None) -> None:
    ensure_directories()
    detector = create_detector()
    embedder = ArcFaceEmbedder(str(ensure_arcface_model()))
    store = EmbeddingStore(USERS_DIR)

    if not display_name:
        display_name = prompt_non_empty("Nama: ")
    if not user_id:
        suggested_user_id = make_user_id(display_name)
        typed_user_id = input(f"User ID [{suggested_user_id}]: ").strip()
        user_id = typed_user_id or suggested_user_id

    frame, detections = capture_face_from_webcam(
        detector,
        "Registrasi Wajah",
        "Buka registrasi, arahkan wajah ke kamera, lalu tekan C untuk simpan.",
    )
    best_face = detections[0]
    embedding_result = embedder.embed(frame, best_face.landmarks)
    output_file = store.save_sample(
        user_id=user_id,
        display_name=display_name,
        embedding=embedding_result.vector.tolist(),
        detector_score=best_face.score,
        bbox={"x": best_face.x, "y": best_face.y, "w": best_face.w, "h": best_face.h},
        landmarks=best_face.landmarks,
        source_image="webcam",
    )

    final_output = output_path or f"output/register-{user_id}.jpg"
    annotated = detector.draw(frame, detections, primary_only=True)
    Path(final_output).parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(final_output, annotated)

    print("Registrasi berhasil.")
    print(f"User ID: {user_id}")
    print(f"Nama: {display_name}")
    print(f"Embedding dimension: {embedding_result.dimension}")
    print(f"Detector score: {best_face.score:.4f}")
    print(f"Annotated image: {final_output}")
    print(f"User vector store: {output_file}")


def best_similarity(query_vector: np.ndarray, user_payload: dict) -> tuple[float, dict | None]:
    best_score = -1.0
    best_sample = None
    for sample in user_payload.get("samples", []):
        candidate = np.array(sample["embedding"], dtype=np.float32)
        score = cosine_similarity(query_vector, candidate)
        if score > best_score:
            best_score = score
            best_sample = sample
    return best_score, best_sample


def find_best_match(query_vector: np.ndarray, user_id: str | None) -> tuple[dict | None, float]:
    store = EmbeddingStore(USERS_DIR)
    candidate_ids = [user_id] if user_id else store.list_user_ids()
    if not candidate_ids:
        raise RuntimeError("No enrolled users found in storage/users")

    best_user_payload = None
    best_score = -1.0
    for candidate_id in candidate_ids:
        payload = store.load_user(candidate_id)
        if payload is None:
            continue
        score, _ = best_similarity(np.asarray(query_vector, dtype=np.float32), payload)
        if score > best_score:
            best_score = score
            best_user_payload = payload

    return best_user_payload, best_score


def run_verify(image_path: str, user_id: str | None, threshold: float, output_path: str | None) -> None:
    ensure_directories()
    detector = create_detector()
    embedder = ArcFaceEmbedder(str(ensure_arcface_model()))
    image = load_image(image_path)

    detections = detector.detect(image)
    if not detections:
        raise RuntimeError("No face detected for verification")

    best_face = detections[0]
    embedding_result = embedder.embed(image, best_face.landmarks)

    best_user_payload, best_score = find_best_match(embedding_result.vector, user_id)
    best_user = best_user_payload["user_id"] if best_user_payload else None
    best_name = best_user_payload.get("name") if best_user_payload else None

    matched = best_user is not None and best_score >= threshold

    if output_path:
        annotated = detector.draw(image, detections, primary_only=True)
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(output_path, annotated)
        print(f"Saved annotated image to: {output_path}")

    print(f"Matched: {matched}")
    print(f"Best user: {best_user}")
    if best_name:
        print(f"Best name: {best_name}")
    print(f"Similarity: {best_score:.4f}")
    print(f"Threshold: {threshold:.4f}")


def run_attendance_camera(threshold: float, user_id: str | None, output_path: str | None) -> None:
    ensure_directories()
    detector = create_detector()
    embedder = ArcFaceEmbedder(str(ensure_arcface_model()))
    attendance_store = AttendanceLogStore(ATTENDANCE_LOG_PATH)

    frame, detections = capture_face_from_webcam(
        detector,
        "Absen Wajah",
        "Klik absen biasa, arahkan wajah ke kamera, lalu tekan C untuk verifikasi.",
    )
    best_face = detections[0]
    embedding_result = embedder.embed(frame, best_face.landmarks)
    best_user_payload, best_score = find_best_match(embedding_result.vector, user_id)

    matched = best_user_payload is not None and best_score >= threshold
    final_output = output_path or "output/attendance.jpg"
    annotated = detector.draw(frame, detections, primary_only=True)
    Path(final_output).parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(final_output, annotated)

    if not matched:
        print("Absensi gagal: wajah tidak dikenali.")
        print(f"Similarity terbaik: {best_score:.4f}")
        print(f"Threshold: {threshold:.4f}")
        print(f"Annotated image: {final_output}")
        return

    entry = attendance_store.append(
        user_id=best_user_payload["user_id"],
        display_name=best_user_payload.get("name", best_user_payload["user_id"]),
        similarity=best_score,
        detector_score=best_face.score,
    )
    print("Absensi berhasil.")
    print(f"User ID: {entry['user_id']}")
    print(f"Nama: {entry['name']}")
    print(f"Similarity: {entry['similarity']:.4f}")
    print(f"Detector score: {entry['detector_score']:.4f}")
    print(f"Log file: {ATTENDANCE_LOG_PATH}")
    print(f"Annotated image: {final_output}")


def run_setup_models() -> None:
    status = setup_models()
    for name, value in status.items():
        print(f"{name}: {value}")


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    setup_parser = subparsers.add_parser("setup-models", help="Download or prepare YuNet and ArcFace model files")
    setup_parser.set_defaults(handler=lambda args: run_setup_models())

    detect_parser = subparsers.add_parser("detect", help="Detect faces and draw bounding boxes with YuNet")
    detect_parser.add_argument("--image", required=True, help="Path to input image")
    detect_parser.add_argument("--output", default="output/detect.jpg", help="Path to output image")
    detect_parser.set_defaults(handler=lambda args: run_detect(args.image, args.output))

    enroll_parser = subparsers.add_parser("enroll", help="Create an ArcFace embedding for one user and store it")
    enroll_parser.add_argument("--user-id", required=True, help="User identifier")
    enroll_parser.add_argument("--name", help="Display name for this user")
    enroll_parser.add_argument("--image", required=True, help="Path to enrollment image")
    enroll_parser.add_argument("--output", help="Optional path for annotated output image")
    enroll_parser.set_defaults(handler=lambda args: run_enroll(args.user_id, args.image, args.output, args.name))

    register_camera_parser = subparsers.add_parser(
        "register-camera",
        help="Input nama lalu buka kamera untuk registrasi awal wajah",
    )
    register_camera_parser.add_argument("--user-id", help="Optional user identifier")
    register_camera_parser.add_argument("--name", help="Display name")
    register_camera_parser.add_argument("--output", help="Optional path for annotated output image")
    register_camera_parser.set_defaults(
        handler=lambda args: run_register_camera(args.user_id, args.name, args.output)
    )

    verify_parser = subparsers.add_parser("verify", help="Compare one face image against stored user embeddings")
    verify_parser.add_argument("--image", required=True, help="Path to verification image")
    verify_parser.add_argument("--user-id", help="Optional user id to compare against a single profile")
    verify_parser.add_argument("--threshold", type=float, default=0.45, help="Cosine similarity threshold")
    verify_parser.add_argument("--output", help="Optional path for annotated output image")
    verify_parser.set_defaults(
        handler=lambda args: run_verify(args.image, args.user_id, args.threshold, args.output)
    )

    attendance_camera_parser = subparsers.add_parser(
        "attendance-camera",
        help="Buka kamera untuk absensi wajah dan cocokkan ke user yang sudah teregistrasi",
    )
    attendance_camera_parser.add_argument("--user-id", help="Optional user id to compare against a single profile")
    attendance_camera_parser.add_argument(
        "--threshold",
        type=float,
        default=0.45,
        help="Cosine similarity threshold",
    )
    attendance_camera_parser.add_argument("--output", help="Optional path for annotated output image")
    attendance_camera_parser.set_defaults(
        handler=lambda args: run_attendance_camera(args.threshold, args.user_id, args.output)
    )

    webcam_parser = subparsers.add_parser("webcam", help="Preview YuNet face detection from webcam")
    webcam_parser.set_defaults(handler=lambda args: run_webcam())

    args = parser.parse_args()
    args.handler(args)


if __name__ == "__main__":
    main()

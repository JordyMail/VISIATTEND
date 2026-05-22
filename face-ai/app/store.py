from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class EmbeddingStore:
    def __init__(self, users_dir: Path):
        self.users_dir = users_dir
        self.users_dir.mkdir(parents=True, exist_ok=True)

    def _user_path(self, user_id: str) -> Path:
        return self.users_dir / f"{user_id}.json"

    def list_user_ids(self) -> list[str]:
        return sorted(path.stem for path in self.users_dir.glob("*.json"))

    def load_user(self, user_id: str) -> dict[str, Any] | None:
        path = self._user_path(user_id)
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def save_sample(
        self,
        user_id: str,
        display_name: str | None,
        embedding: list[float],
        detector_score: float,
        bbox: dict[str, int],
        landmarks: list[tuple[float, float]],
        source_image: str,
    ) -> Path:
        now = datetime.now(timezone.utc).isoformat()
        path = self._user_path(user_id)
        payload = self.load_user(user_id)

        if payload is None:
            payload = {
                "user_id": user_id,
                "name": display_name or user_id,
                "detector": "YuNet",
                "embedder": "ArcFace",
                "embedding_format": "normalized_float32_list",
                "embedding_dim": len(embedding),
                "created_at": now,
                "updated_at": now,
                "samples": [],
            }
        elif display_name:
            payload["name"] = display_name
        elif "name" not in payload:
            payload["name"] = user_id

        payload["updated_at"] = now
        payload["samples"].append(
            {
                "created_at": now,
                "source_image": source_image,
                "detector_score": detector_score,
                "bbox": bbox,
                "landmarks": [{"x": float(x), "y": float(y)} for x, y in landmarks],
                "embedding": [float(value) for value in embedding],
            }
        )

        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return path


class AttendanceLogStore:
    def __init__(self, log_path: Path):
        self.log_path = log_path
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def append(
        self,
        user_id: str,
        display_name: str,
        similarity: float,
        detector_score: float,
    ) -> dict[str, Any]:
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "name": display_name,
            "similarity": float(similarity),
            "detector_score": float(detector_score),
            "status": "success",
        }
        with self.log_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry) + "\n")
        return entry

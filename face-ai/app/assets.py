from __future__ import annotations

from pathlib import Path
from urllib.request import urlretrieve
from zipfile import ZipFile


BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
STORAGE_DIR = BASE_DIR / "storage"
USERS_DIR = STORAGE_DIR / "users"
ATTENDANCE_LOG_PATH = STORAGE_DIR / "attendance_logs.jsonl"
YUNET_MODEL_PATH = MODELS_DIR / "face_detection_yunet_2023mar.onnx"
ARCFACE_MODEL_DIR = MODELS_DIR / "buffalo_l"
ARCFACE_MODEL_PATH = ARCFACE_MODEL_DIR / "w600k_r50.onnx"
ARCFACE_FALLBACK_PATH = MODELS_DIR / "w600k_r50.onnx"

YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
ARCFACE_PACK_URL = "https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip"


def ensure_directories() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    USERS_DIR.mkdir(parents=True, exist_ok=True)
    ATTENDANCE_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)


def download_file(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    urlretrieve(url, destination)


def setup_models() -> dict[str, str]:
    ensure_directories()
    result: dict[str, str] = {}

    if not YUNET_MODEL_PATH.exists():
        download_file(YUNET_URL, YUNET_MODEL_PATH)
        result["yunet"] = f"downloaded:{YUNET_MODEL_PATH}"
    else:
        result["yunet"] = f"existing:{YUNET_MODEL_PATH}"

    if ARCFACE_MODEL_PATH.exists():
        result["arcface"] = f"existing:{ARCFACE_MODEL_PATH}"
        return result

    if ARCFACE_FALLBACK_PATH.exists():
        result["arcface"] = f"existing:{ARCFACE_FALLBACK_PATH}"
        return result

    archive_path = MODELS_DIR / "buffalo_l.zip"
    try:
        download_file(ARCFACE_PACK_URL, archive_path)
        with ZipFile(archive_path, "r") as archive:
            archive.extractall(MODELS_DIR)
        if ARCFACE_MODEL_PATH.exists():
            result["arcface"] = f"downloaded:{ARCFACE_MODEL_PATH}"
        elif ARCFACE_FALLBACK_PATH.exists():
            result["arcface"] = f"downloaded:{ARCFACE_FALLBACK_PATH}"
        else:
            result["arcface"] = (
                "failed: ArcFace pack extracted but w600k_r50.onnx was not found in expected locations"
            )
    except Exception as exc:
        result["arcface"] = (
            "failed: download buffalo_l pack manually and place "
            f"w600k_r50.onnx at {ARCFACE_MODEL_PATH} or {ARCFACE_FALLBACK_PATH}. reason={exc}"
        )
    finally:
        if archive_path.exists():
            archive_path.unlink(missing_ok=True)

    return result


def ensure_yunet_model() -> Path:
    if not YUNET_MODEL_PATH.exists():
        raise FileNotFoundError(
            f"YuNet model not found at {YUNET_MODEL_PATH}. Run `python app\\main.py setup-models` first."
        )
    return YUNET_MODEL_PATH


def ensure_arcface_model() -> Path:
    if not ARCFACE_MODEL_PATH.exists():
        if ARCFACE_FALLBACK_PATH.exists():
            return ARCFACE_FALLBACK_PATH
        raise FileNotFoundError(
            f"ArcFace model not found at {ARCFACE_MODEL_PATH}. Run `python app\\main.py setup-models` first."
        )
    return ARCFACE_MODEL_PATH
from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class Detection:
    x: int
    y: int
    w: int
    h: int
    score: float
    landmarks: list[tuple[float, float]]


class FaceDetector:
    def __init__(
        self,
        model_path: str,
        input_size: tuple[int, int] = (320, 320),
        score_threshold: float = 0.8,
        nms_threshold: float = 0.3,
        top_k: int = 5000,
    ):
        if not hasattr(cv2, "FaceDetectorYN_create"):
            raise RuntimeError(
                "Your OpenCV build does not expose YuNet. Install opencv-contrib-python from requirements.txt."
            )

        self.detector = cv2.FaceDetectorYN_create(
            model_path,
            "",
            input_size,
            score_threshold,
            nms_threshold,
            top_k,
        )

    def detect(self, image: np.ndarray) -> list[Detection]:
        height, width = image.shape[:2]
        self.detector.setInputSize((width, height))
        _, faces = self.detector.detect(image)

        if faces is None:
            return []

        detections: list[Detection] = []
        for face in faces:
            x, y, w, h = face[:4]
            score = float(face[-1])
            landmarks = [
                (float(face[4]), float(face[5])),
                (float(face[6]), float(face[7])),
                (float(face[8]), float(face[9])),
                (float(face[10]), float(face[11])),
                (float(face[12]), float(face[13])),
            ]
            detections.append(
                Detection(
                    x=int(round(float(x))),
                    y=int(round(float(y))),
                    w=int(round(float(w))),
                    h=int(round(float(h))),
                    score=score,
                    landmarks=landmarks,
                )
            )

        detections.sort(key=lambda item: (item.w * item.h, item.score), reverse=True)
        return detections

    def get_primary_detection(self, detections: list[Detection]) -> Detection | None:
        if not detections:
            return None
        return detections[0]

    def draw(self, image: np.ndarray, detections: list[Detection], primary_only: bool = False) -> np.ndarray:
        result = image.copy()
        if primary_only:
            primary = self.get_primary_detection(detections)
            detections = [primary] if primary else []

        for index, det in enumerate(detections, start=1):
            cv2.rectangle(
                result,
                (det.x, det.y),
                (det.x + det.w, det.y + det.h),
                (0, 255, 0),
                2,
            )

            for point in det.landmarks:
                cv2.circle(
                    result,
                    (int(round(point[0])), int(round(point[1]))),
                    2,
                    (0, 255, 255),
                    -1,
                )

            cv2.putText(
                result,
                f"face-{index} score={det.score:.2f}",
                (det.x, max(det.y - 10, 20)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2,
            )
        return result

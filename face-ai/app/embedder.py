from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


ARC_FACE_TEMPLATE = np.array(
    [
        [38.2946, 51.6963],
        [73.5318, 51.5014],
        [56.0252, 71.7366],
        [41.5493, 92.3655],
        [70.7299, 92.2041],
    ],
    dtype=np.float32,
)


@dataclass
class EmbeddingResult:
    vector: np.ndarray
    aligned_face: np.ndarray
    dimension: int


def cosine_similarity(vector_a: np.ndarray, vector_b: np.ndarray) -> float:
    return float(np.dot(vector_a, vector_b))


class ArcFaceEmbedder:
    def __init__(self, model_path: str, input_size: tuple[int, int] = (112, 112)):
        self.network = cv2.dnn.readNetFromONNX(model_path)
        self.input_size = input_size
        self.input_mean = 127.5
        self.input_std = 127.5

    def align_face(self, image: np.ndarray, landmarks: list[tuple[float, float]]) -> np.ndarray:
        source = np.array(landmarks, dtype=np.float32)
        transform, _ = cv2.estimateAffinePartial2D(source, ARC_FACE_TEMPLATE, method=cv2.LMEDS)
        if transform is None:
            raise RuntimeError("Failed to estimate alignment transform for ArcFace")

        return cv2.warpAffine(
            image,
            transform,
            self.input_size,
            borderValue=0.0,
        )

    def embed(self, image: np.ndarray, landmarks: list[tuple[float, float]]) -> EmbeddingResult:
        aligned_face = self.align_face(image, landmarks)
        blob = cv2.dnn.blobFromImage(
            aligned_face,
            scalefactor=1.0 / self.input_std,
            size=self.input_size,
            mean=(self.input_mean, self.input_mean, self.input_mean),
            swapRB=True,
        )
        self.network.setInput(blob)
        vector = self.network.forward().flatten().astype(np.float32)
        vector /= np.linalg.norm(vector) + 1e-12
        return EmbeddingResult(vector=vector, aligned_face=aligned_face, dimension=int(vector.shape[0]))
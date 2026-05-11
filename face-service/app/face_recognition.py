"""
Face Recognition Engine - High Accuracy Version
Menggunakan DeepFace dengan ArcFace model + RetinaFace detector
untuk akurasi maksimal pada face matching.
"""

import numpy as np
import cv2
from deepface import DeepFace
import os
import json
import io
from typing import Optional, Dict, Any, List
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

# Jumlah maksimum embedding yang disimpan per user (multi-angle)
MAX_EMBEDDINGS_PER_USER = 5


class FaceRecognitionEngine:
    """
    Engine untuk face recognition menggunakan DeepFace.
    Menggunakan ArcFace (model paling akurat) + RetinaFace (detector paling akurat).
    Mendukung multi-embedding per user untuk handle variasi sudut/pencahayaan.
    """
    
    def __init__(self, config):
        self.config = config
        self.model_loaded = False
        self.face_data_dir = config.STORAGE_DIR
        # ArcFace = model paling akurat untuk face recognition
        self.model_name = getattr(config, 'MODEL_NAME', 'ArcFace')
        # RetinaFace = detector wajah paling akurat
        self.detector_backend = getattr(config, 'FACE_DETECTION_BACKEND', 'retinaface')
        # Threshold cosine similarity (0-1, lebih tinggi = lebih strict)
        self.threshold = getattr(config, 'CONFIDENCE_THRESHOLD', 0.55)
        # Minimum face size ratio (wajah harus minimal 10% dari image)
        self.min_face_ratio = 0.05
        # Blur threshold (Laplacian variance, di bawah ini = terlalu blur)
        self.blur_threshold = 50.0
        
        os.makedirs(self.face_data_dir, exist_ok=True)
        
        logger.info(
            f"FaceRecognitionEngine initialized - model={self.model_name}, "
            f"detector={self.detector_backend}, threshold={self.threshold}"
        )
    
    async def initialize(self):
        """Initialize engine dengan load model"""
        try:
            logger.info(f"Loading DeepFace model: {self.model_name} with {self.detector_backend}")
            test_img = np.zeros((160, 160, 3), dtype=np.uint8)
            DeepFace.represent(
                img_path=test_img,
                model_name=self.model_name,
                enforce_detection=False
            )
            self.model_loaded = True
            logger.info("DeepFace model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load DeepFace model: {str(e)}")
            raise
    
    def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up FaceRecognitionEngine")
        self.model_loaded = False
    
    def _preprocess_image(self, img: np.ndarray) -> np.ndarray:
        """
        Preprocess image untuk meningkatkan akurasi face detection.
        - CLAHE histogram equalization untuk perbaiki kontras/pencahayaan
        - Denoise untuk kurangi noise dari kamera HP
        """
        # Convert ke LAB color space untuk CLAHE
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l_channel, a, b = cv2.split(lab)
        
        # Apply CLAHE ke luminance channel
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_channel = clahe.apply(l_channel)
        
        lab = cv2.merge([l_channel, a, b])
        result = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        
        # Light denoise (hanya jika image cukup besar)
        h, w = result.shape[:2]
        if h >= 200 and w >= 200:
            result = cv2.fastNlMeansDenoisingColored(result, None, 5, 5, 7, 21)
        
        return result
    
    def _check_image_quality(self, img: np.ndarray) -> Dict[str, Any]:
        """
        Cek kualitas image sebelum proses.
        Return dict dengan info quality dan apakah acceptable.
        """
        h, w = img.shape[:2]
        
        # Check resolusi minimum
        if h < 100 or w < 100:
            return {
                "acceptable": False,
                "reason": "Image resolution too low (minimum 100x100)",
                "width": w,
                "height": h
            }
        
        # Check blur (Laplacian variance)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        is_blurry = laplacian_var < self.blur_threshold
        
        # Check brightness
        brightness = np.mean(gray)
        is_too_dark = brightness < 40
        is_too_bright = brightness > 220
        
        acceptable = not is_blurry and not is_too_dark and not is_too_bright
        
        quality_info = {
            "acceptable": acceptable,
            "width": w,
            "height": h,
            "blur_score": float(laplacian_var),
            "brightness": float(brightness),
            "is_blurry": is_blurry,
            "is_too_dark": is_too_dark,
            "is_too_bright": is_too_bright
        }
        
        if not acceptable:
            reasons = []
            if is_blurry:
                reasons.append(f"Image too blurry (score: {laplacian_var:.1f}, min: {self.blur_threshold})")
            if is_too_dark:
                reasons.append(f"Image too dark (brightness: {brightness:.1f})")
            if is_too_bright:
                reasons.append(f"Image too bright (brightness: {brightness:.1f})")
            quality_info["reason"] = "; ".join(reasons)
        
        return quality_info
    
    def _cosine_similarity(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """
        Hitung cosine similarity antara 2 embedding.
        Return value 0-1 (1 = identik).
        """
        dot = np.dot(emb1, emb2)
        norm1 = np.linalg.norm(emb1)
        norm2 = np.linalg.norm(emb2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(dot / (norm1 * norm2))
    
    def _compare_with_multi_embeddings(
        self, input_embedding: np.ndarray, stored_embeddings: List[List[float]]
    ) -> float:
        """
        Bandingkan input embedding dengan multiple stored embeddings.
        Return confidence terbaik (max cosine similarity).
        """
        best_similarity = 0.0
        for stored in stored_embeddings:
            stored_arr = np.array(stored)
            similarity = self._cosine_similarity(input_embedding, stored_arr)
            if similarity > best_similarity:
                best_similarity = similarity
        return best_similarity
    
    async def register_face(
        self,
        user_id: str,
        file,
        device_info: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Register wajah user dengan multi-embedding support.
        Setiap registrasi menambah embedding baru (sampai MAX_EMBEDDINGS_PER_USER).
        Ini meningkatkan akurasi karena menangkap variasi wajah.
        """
        try:
            logger.info(f"Processing face registration for user {user_id}")
            
            contents = await file.read()
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                raise ValueError("Could not decode image")
            
            # Check image quality
            quality = self._check_image_quality(img)
            if not quality["acceptable"]:
                logger.warning(f"Low quality image for user {user_id}: {quality.get('reason', 'unknown')}")
                # Tetap lanjut tapi log warning - jangan reject agar UX tetap baik
            
            # Preprocess image untuk akurasi lebih baik
            img_processed = self._preprocess_image(img)
            
            # Detect face dengan RetinaFace (paling akurat)
            logger.info(f"Detecting face with {self.detector_backend} for user {user_id}")
            face_objs = DeepFace.extract_faces(
                img_path=img_processed,
                enforce_detection=True,
                detector_backend=self.detector_backend
            )
            
            if not face_objs or len(face_objs) == 0:
                raise ValueError("No face detected in image")
            
            if len(face_objs) > 1:
                logger.warning(f"Multiple faces detected for user {user_id}, using largest face")
            
            # Pilih wajah terbesar (lebih reliable)
            best_face = max(face_objs, key=lambda f: f.get("confidence", 0.0))
            face_confidence = best_face.get("confidence", 0.0)
            
            # Check face confidence dari detector
            if face_confidence < 0.9:
                logger.warning(f"Low face detection confidence: {face_confidence:.4f} for user {user_id}")
            
            # Extract embedding dengan model ArcFace
            logger.info(f"Extracting {self.model_name} embedding for user {user_id}")
            embedding_objs = DeepFace.represent(
                img_path=img_processed,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=False,
                align=True  # Face alignment untuk akurasi lebih baik
            )
            
            if not embedding_objs or len(embedding_objs) == 0:
                raise ValueError("Could not extract face embedding")
            
            new_embedding = embedding_objs[0]["embedding"]
            
            # L2-normalize embedding (penting untuk cosine similarity)
            new_embedding_arr = np.array(new_embedding)
            norm = np.linalg.norm(new_embedding_arr)
            if norm > 0:
                new_embedding = (new_embedding_arr / norm).tolist()
            
            # Load existing data atau buat baru (multi-embedding)
            embedding_path = os.path.join(self.face_data_dir, f"{user_id}_embedding.json")
            
            if os.path.exists(embedding_path):
                with open(embedding_path, 'r') as f:
                    user_data = json.load(f)
                
                # Migrasi dari format lama (single embedding) ke multi-embedding
                if "embedding" in user_data and "embeddings" not in user_data:
                    old_emb = user_data["embedding"]
                    # Normalize old embedding too
                    old_arr = np.array(old_emb)
                    old_norm = np.linalg.norm(old_arr)
                    if old_norm > 0:
                        old_emb = (old_arr / old_norm).tolist()
                    user_data["embeddings"] = [old_emb]
                    del user_data["embedding"]
                
                embeddings = user_data.get("embeddings", [])
                
                # Cek apakah embedding baru terlalu mirip dengan yang sudah ada
                # (tidak perlu simpan duplikat)
                is_duplicate = False
                for existing in embeddings:
                    sim = self._cosine_similarity(
                        np.array(new_embedding), np.array(existing)
                    )
                    if sim > 0.95:  # Terlalu mirip, skip
                        is_duplicate = True
                        break
                
                if not is_duplicate:
                    if len(embeddings) >= MAX_EMBEDDINGS_PER_USER:
                        # Hapus embedding terlama
                        embeddings.pop(0)
                    embeddings.append(new_embedding)
                    logger.info(f"Added new embedding for user {user_id} (total: {len(embeddings)})")
                else:
                    logger.info(f"Skipping duplicate embedding for user {user_id}")
                
                user_data["embeddings"] = embeddings
                user_data["updated_at"] = datetime.utcnow().isoformat()
                user_data["embedding_count"] = len(embeddings)
            else:
                user_data = {
                    "user_id": user_id,
                    "embeddings": [new_embedding],
                    "registered_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                    "device_info": device_info,
                    "model": self.model_name,
                    "detector": self.detector_backend,
                    "face_detected": True,
                    "confidence": float(face_confidence),
                    "embedding_count": 1
                }
            
            with open(embedding_path, 'w') as f:
                json.dump(user_data, f, indent=2)
            
            embedding_count = len(user_data.get("embeddings", []))
            logger.info(f"Face embedding saved for user {user_id} ({embedding_count} embeddings)")
            
            return {
                "user_id": user_id,
                "face_registered": True,
                "confidence": float(face_confidence),
                "embedding_size": len(new_embedding),
                "embedding_count": embedding_count,
                "image_quality": quality
            }
        
        except Exception as e:
            logger.error(f"Error registering face for user {user_id}: {str(e)}")
            raise
    
    async def verify_face(
        self,
        file,
        user_id: Optional[str] = None,
        device_info: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verify wajah menggunakan cosine similarity + multi-embedding matching.
        """
        try:
            logger.info(f"Processing face verification")
            
            contents = await file.read()
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                raise ValueError("Could not decode image")
            
            # Preprocess image
            img_processed = self._preprocess_image(img)
            
            # Detect face dengan RetinaFace
            logger.info(f"Detecting face with {self.detector_backend}")
            try:
                face_objs = DeepFace.extract_faces(
                    img_path=img_processed,
                    enforce_detection=True,
                    detector_backend=self.detector_backend
                )
            except Exception as detect_err:
                logger.warning(f"Face detection failed: {detect_err}")
                return {
                    "matched": False,
                    "matched_user_id": None,
                    "confidence": 0.0,
                    "code": "FACE_NOT_DETECTED",
                    "message": "No face detected in image"
                }
            
            if not face_objs or len(face_objs) == 0:
                return {
                    "matched": False,
                    "matched_user_id": None,
                    "confidence": 0.0,
                    "code": "FACE_NOT_DETECTED",
                    "message": "No face detected in image"
                }
            
            # Check face detection confidence
            best_face = max(face_objs, key=lambda f: f.get("confidence", 0.0))
            face_confidence = best_face.get("confidence", 0.0)
            
            if face_confidence < 0.85:
                logger.warning(f"Low face detection confidence: {face_confidence:.4f}")
            
            # Extract embedding
            logger.info(f"Extracting {self.model_name} embedding for verification")
            embedding_objs = DeepFace.represent(
                img_path=img_processed,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=False,
                align=True
            )
            
            if not embedding_objs or len(embedding_objs) == 0:
                return {
                    "matched": False,
                    "matched_user_id": None,
                    "confidence": 0.0,
                    "code": "FACE_NOT_DETECTED"
                }
            
            input_embedding = np.array(embedding_objs[0]["embedding"])
            
            # L2-normalize
            norm = np.linalg.norm(input_embedding)
            if norm > 0:
                input_embedding = input_embedding / norm
            
            if user_id:
                logger.info(f"Verifying against specific user: {user_id}")
                return self._verify_against_user(
                    user_id=user_id,
                    input_embedding=input_embedding
                )
            
            logger.info("Searching database for best match")
            return self._search_best_match(input_embedding)
        
        except Exception as e:
            logger.error(f"Error verifying face: {str(e)}")
            return {
                "matched": False,
                "matched_user_id": None,
                "confidence": 0.0,
                "code": "ERROR",
                "message": str(e)
            }
    
    def _load_user_embeddings(self, user_id: str) -> Optional[List[List[float]]]:
        """
        Load embeddings untuk user. Support format lama (single) dan baru (multi).
        """
        embedding_path = os.path.join(self.face_data_dir, f"{user_id}_embedding.json")
        
        if not os.path.exists(embedding_path):
            return None
        
        with open(embedding_path, 'r') as f:
            user_data = json.load(f)
        
        # Format baru: multi-embedding
        if "embeddings" in user_data:
            return user_data["embeddings"]
        
        # Format lama: single embedding
        if "embedding" in user_data:
            return [user_data["embedding"]]
        
        return None
    
    def _verify_against_user(
        self,
        user_id: str,
        input_embedding: np.ndarray
    ) -> Dict[str, Any]:
        """
        Verify embedding terhadap user tertentu menggunakan cosine similarity.
        Membandingkan dengan semua stored embeddings dan ambil yang terbaik.
        """
        try:
            stored_embeddings = self._load_user_embeddings(user_id)
            
            if stored_embeddings is None:
                logger.warning(f"No registered face found for user {user_id}")
                return {
                    "matched": False,
                    "matched_user_id": None,
                    "confidence": 0.0,
                    "code": "FACE_NOT_REGISTERED",
                    "message": f"User {user_id} has no registered face"
                }
            
            # Cosine similarity terhadap semua stored embeddings
            confidence = self._compare_with_multi_embeddings(
                input_embedding, stored_embeddings
            )
            
            logger.info(
                f"User {user_id}: cosine_similarity={confidence:.4f}, "
                f"threshold={self.threshold}, embeddings_count={len(stored_embeddings)}"
            )
            
            is_match = confidence >= self.threshold
            
            return {
                "matched": is_match,
                "matched_user_id": user_id if is_match else None,
                "confidence": float(confidence),
                "code": "FACE_MATCH" if is_match else "FACE_NOT_MATCH",
                "similarity": float(confidence),
                "embeddings_compared": len(stored_embeddings)
            }
        
        except Exception as e:
            logger.error(f"Error verifying against user {user_id}: {str(e)}")
            return {
                "matched": False,
                "matched_user_id": None,
                "confidence": 0.0,
                "code": "ERROR",
                "message": str(e)
            }
    
    def _search_best_match(self, input_embedding: np.ndarray) -> Dict[str, Any]:
        """
        Search database untuk best match menggunakan cosine similarity.
        """
        try:
            best_match = None
            best_confidence = 0.0
            
            for filename in os.listdir(self.face_data_dir):
                if filename.endswith("_embedding.json"):
                    user_id = filename.replace("_embedding.json", "")
                    
                    try:
                        stored_embeddings = self._load_user_embeddings(user_id)
                        if stored_embeddings is None:
                            continue
                        
                        confidence = self._compare_with_multi_embeddings(
                            input_embedding, stored_embeddings
                        )
                        
                        logger.debug(f"User {user_id}: similarity={confidence:.4f}")
                        
                        if confidence > best_confidence:
                            best_confidence = confidence
                            best_match = user_id
                    
                    except Exception as e:
                        logger.warning(f"Error processing embedding for {user_id}: {str(e)}")
                        continue
            
            if best_match is None or best_confidence < self.threshold:
                logger.info(
                    f"No matching face found (best: {best_match}, "
                    f"confidence: {best_confidence:.4f}, threshold: {self.threshold})"
                )
                return {
                    "matched": False,
                    "matched_user_id": None,
                    "confidence": float(best_confidence),
                    "code": "FACE_NOT_MATCH"
                }
            
            logger.info(f"Best match: {best_match} (confidence: {best_confidence:.4f})")
            
            return {
                "matched": True,
                "matched_user_id": best_match,
                "confidence": float(best_confidence),
                "code": "FACE_MATCH",
                "similarity": float(best_confidence)
            }
        
        except Exception as e:
            logger.error(f"Error searching for best match: {str(e)}")
            return {
                "matched": False,
                "matched_user_id": None,
                "confidence": 0.0,
                "code": "ERROR",
                "message": str(e)
            }
    
    def check_registration(self, user_id: str) -> bool:
        """
        Check apakah user sudah register wajah.
        """
        try:
            embedding_path = os.path.join(self.face_data_dir, f"{user_id}_embedding.json")
            is_registered = os.path.exists(embedding_path)
            logger.info(f"User {user_id} face registered: {is_registered}")
            return is_registered
        except Exception as e:
            logger.error(f"Error checking registration for {user_id}: {str(e)}")
            return False
    
    def delete_face_profile(self, user_id: str) -> bool:
        """
        Delete wajah profile user.
        """
        try:
            embedding_path = os.path.join(self.face_data_dir, f"{user_id}_embedding.json")
            
            if os.path.exists(embedding_path):
                os.remove(embedding_path)
                logger.info(f"Face profile deleted for user {user_id}")
                return True
            else:
                logger.warning(f"Face profile not found for user {user_id}")
                return False
        
        except Exception as e:
            logger.error(f"Error deleting face profile for {user_id}: {str(e)}")
            return False

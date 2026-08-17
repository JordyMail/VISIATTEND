import sys
import os
import json
import csv
from pathlib import Path

# Add app folder to system path for imports
sys.path.append(str(Path(__file__).parent / "app"))

try:
    import cv2
    import numpy as np
    from detector import FaceDetector
    from assets import ensure_yunet_model
except ImportError as e:
    print(f"ImportError: {e}")
    print("Ensure that the Python virtual environment is activated and requirements are installed.")
    sys.exit(1)

def run_face_detection_experiment():
    print("Starting face detection experiments...")
    detector_model = str(ensure_yunet_model())
    detector = FaceDetector(detector_model)
    
    test_images_dir = Path(__file__).parent.parent / "test-images"
    images = {
        "real_face": test_images_dir / "real.jpg",
        "photo_on_phone": test_images_dir / "photo_hp.jpg",
        "replay_on_phone": test_images_dir / "replay_hp.jpg"
    }
    
    # Generate a composite multi-face image dynamically by stitching real_face and photo_on_phone
    try:
        real_img = cv2.imread(str(images["real_face"]))
        hp_img = cv2.imread(str(images["photo_on_phone"]))
        if real_img is not None and hp_img is not None:
            h1, w1 = real_img.shape[:2]
            h2, w2 = hp_img.shape[:2]
            target_h = min(h1, h2)
            
            # Resize images to match height
            real_resized = cv2.resize(real_img, (int(w1 * target_h / h1), target_h))
            hp_resized = cv2.resize(hp_img, (int(w2 * target_h / h2), target_h))
            
            # Stitch horizontal
            multi_img = np.hstack((real_resized, hp_resized))
            multi_path = test_images_dir / "multi_face_composite.jpg"
            cv2.imwrite(str(multi_path), multi_img)
            images["multi_face_composite"] = multi_path
            print(f"Dynamically generated multi-face composite: {multi_path}")
    except Exception as e:
        print(f"Failed to generate multi-face composite image: {e}")
    
    detection_rows = []
    
    for scenario_name, img_path in images.items():
        if not img_path.exists():
            print(f"Skipping {scenario_name}: {img_path} not found")
            continue
            
        print(f"Processing scenario: {scenario_name} ({img_path.name})")
        image = cv2.imread(str(img_path))
        if image is None:
            print(f"  Failed to read image: {img_path}")
            continue
            
        detections = detector.detect(image)
        num_faces = len(detections)
        print(f"  Detected {num_faces} faces")
        
        for idx, det in enumerate(detections):
            face_index = idx + 1
            area = det.w * det.h
            selected = (idx == 0) # Sorted descending by area, index 0 is selected
            
            detection_rows.append({
                "Scenario": scenario_name,
                "NumberOfFaces": num_faces,
                "FaceIndex": face_index,
                "X": det.x,
                "Y": det.y,
                "Width": det.w,
                "Height": det.h,
                "Area": area,
                "DetectorScore": round(float(det.score), 4),
                "Selected(True/False)": str(selected)
            })
            
    # Write to CSV
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / "face_detection_experiment.csv"
    
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "Scenario", "NumberOfFaces", "FaceIndex", "X", "Y", "Width", "Height", "Area", "DetectorScore", "Selected(True/False)"
        ])
        writer.writeheader()
        writer.writerows(detection_rows)
        
    print(f"Saved detection results to: {csv_path}\n")

def parse_audit_logs():
    print("Parsing verification audit logs...")
    storage_dir = Path(__file__).parent / "storage"
    active_log_path = storage_dir / "verification_audit.jsonl"
    passive_log_path = storage_dir / "verification_audit_passive_archive.jsonl"
    
    audit_rows = []
    
    def process_log_file(log_path, source_type):
        if not log_path.exists():
            print(f"Log file not found: {log_path}")
            return
            
        with open(log_path, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                    outcome = record.get("outcome", "UNKNOWN")
                    rec = record.get("recognition", {})
                    sim = rec.get("bestScore", None)
                    matched_user = rec.get("matchedUserId", None)
                    
                    scenario = record.get("attemptId", f"{source_type}_{line_num}")
                    
                    # Resolve bounding box area from user file if matched_user is available
                    selected_area = "N/A"
                    if matched_user:
                        user_file = storage_dir / "users" / f"{matched_user}.json"
                        if user_file.exists():
                            try:
                                user_data = json.loads(user_file.read_text(encoding="utf-8"))
                                samples = user_data.get("samples", [])
                                if samples:
                                    bbox = samples[0].get("bbox", {})
                                    if "w" in bbox and "h" in bbox:
                                        selected_area = int(bbox["w"]) * int(bbox["h"])
                            except Exception:
                                pass
                                
                    audit_rows.append({
                        "Scenario": f"{source_type}_{scenario[:8]}",
                        "DetectedFaces": 1, # The logs only document the primary detected face
                        "SelectedArea": selected_area,
                        "SimilarityScore": round(float(sim), 4) if sim is not None else "N/A",
                        "MatchedUser": matched_user if matched_user else "None",
                        "VerificationResult": outcome
                    })
                except Exception as e:
                    print(f"Error parsing line {line_num} in {log_path.name}: {e}")
                    
    process_log_file(active_log_path, "active")
    process_log_file(passive_log_path, "passive")
    
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / "face_verification_experiment.csv"
    
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "Scenario", "DetectedFaces", "SelectedArea", "SimilarityScore", "MatchedUser", "VerificationResult"
        ])
        writer.writeheader()
        writer.writerows(audit_rows)
        
    print(f"Saved verification results to: {csv_path}\n")
    
    # Summary Metrics Calculation
    total = len(audit_rows)
    passes = sum(1 for r in audit_rows if r["VerificationResult"] == "PASS")
    failures = total - passes
    accuracy = (passes / total * 100.0) if total > 0 else 0.0
    
    scores = [float(r["SimilarityScore"]) for r in audit_rows if isinstance(r["SimilarityScore"], (float, int)) or (isinstance(r["SimilarityScore"], str) and r["SimilarityScore"] != "N/A")]
    avg_score = (sum(scores) / len(scores)) if scores else 0.0
    
    print("="*60)
    print("EXPERIMENTAL SUMMARY REPORT")
    print("="*60)
    print(f"Total Verification Scenarios:  {total}")
    print(f"Verification Success (PASS):  {passes}")
    print(f"Verification Failure (FAIL):  {failures}")
    print(f"Overall Accuracy Rate:        {accuracy:.2f}%")
    print(f"Average Cosine Similarity:    {avg_score:.4f}")
    print("="*60)

if __name__ == "__main__":
    run_face_detection_experiment()
    parse_audit_logs()

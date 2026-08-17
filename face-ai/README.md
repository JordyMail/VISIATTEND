# VISIATTEND Face AI

Folder ini adalah versi lokal dari sandbox AI face attendance yang sekarang sudah dibawa masuk ke repo VISIATTEND supaya lebih mudah dijalankan dan tidak bergantung ke folder luar.

Struktur utama:

- `app/` berisi kode Python untuk deteksi wajah, embedding, bridge backend, dan command line flow
- `models/` untuk model YuNet (deteksi) dan ArcFace (recognition)
- `storage/` untuk user face embeddings dan audit log verifikasi
- `output/` untuk hasil gambar anotasi jika memakai mode CLI
- `samples/` untuk file gambar uji coba jika dibutuhkan

## Setup pertama kali

Masuk ke folder ini:

```powershell
cd E:\CAPSTONE\BEpy\VISIATTEND\face-ai
```

Buat virtual environment:

```powershell
python -m venv venv
```

Aktifkan venv:

```powershell
venv\Scripts\Activate.ps1
```

Install dependency:

```powershell
pip install -r requirements.txt
```

Download model:

```powershell
python app\main.py setup-models
```

## Integrasi dengan VISIATTEND

Backend VISIATTEND sekarang default memanggil bridge lokal ini melalui:

- `face-ai/app/backend_bridge.py`

Kalau mau override path Python atau root AI, bisa pakai env var berikut:

- `FACE_AI_ROOT`
- `FACE_AI_PYTHON`
- `FACE_AI_BRIDGE`

## Active Liveness Detection

Pipeline attendance:

```
Face Detection → Active Liveness Challenge → Face Recognition → Attendance
```

Face recognition **tidak dijalankan** jika Active Liveness challenge belum berhasil.

### Cara kerja

Sistem menggunakan **Active Liveness Detection** berbasis MediaPipe Face Mesh di sisi browser (frontend). Sebelum attendance diproses, user harus menyelesaikan satu tantangan interaktif yang dipilih secara acak:

| Challenge | Cara melakukan |
|-----------|----------------|
| `blink`      | Kedipkan mata sekali |
| `turn_left`  | Putar kepala ke kiri |
| `turn_right` | Putar kepala ke kanan |
| `smile`      | Senyum |

Challenge dipantau real-time menggunakan landmark wajah (EAR untuk blink, yaw angle untuk head-turn, mouth ratio untuk smile). Attendance **tidak bisa dilanjutkan** sebelum challenge terpenuhi dalam batas waktu 9 detik.

### Alur verifikasi

1. Frontend menjalankan MediaPipe Face Mesh dan memantau landmark 468 titik secara real-time.
2. Challenge dipilih acak dari 4 jenis.
3. Ketika challenge terpenuhi, frontend mengirim `activeLiveness: { passed: true, challenge, durationMs, metrics }` ke backend.
4. Backend (`faceAi.ts`) menolak request dengan HTTP 403 jika `activeLiveness.passed` bukan `true`.
5. Backend meneruskan gambar + `activeLiveness` ke Python bridge (`backend_bridge.py`).
6. Python bridge menjalankan face recognition (YuNet + ArcFace via OpenCV DNN) dan mengembalikan hasil.

### Kelebihan Active Liveness

- Tidak memerlukan model anti-spoof tambahan.
- Tidak bergantung pada kondisi pencahayaan atau kualitas kamera untuk deteksi spoof.
- Spoofing dengan foto atau video replay tidak dapat lolos karena user harus melakukan gerakan interaktif.
- Tidak ada false negative akibat threshold yang tidak terkalibrasi.

## Verification Audit Log (Debug)

Setiap attempt verifikasi (PASS maupun FAIL) dicatat ke:

- `storage/verification_audit.jsonl`

Dan dicetak ke console dengan prefix:

- `[VERIFY_AUDIT] {...}`

Field yang dicatat per attempt:

- `attemptId` — ID unik per attempt
- `timestamp` — waktu UTC ISO 8601
- `modelMode` — selalu `recognition_only` (Active Liveness era)
- `livenessScore` — `1.0` jika Active Liveness passed, `0.0` jika tidak
- `faceRecognitionRan` — apakah face recognition dijalankan
- `outcome` — `PASS` / `FAIL_INPUT` / `FAIL_RECOGNITION`
- `reason` — penjelasan singkat hasil
- `activeLiveness` — objek `{ passed, challenge, durationMs, metrics }` dari frontend
- `recognition` — `{ bestScore, threshold, matchedUserId }` jika recognition dijalankan

> Log lama dari era Passive Liveness tersimpan di `storage/verification_audit_passive_archive.jsonl`.

## Command penting

Registrasi lewat webcam:

```powershell
python app\main.py register-camera
```

Attendance lewat webcam:

```powershell
python app\main.py attendance-camera
```

Bridge backend:

```powershell
python app\backend_bridge.py --help
```

# VISIATTEND Face AI

Folder ini adalah versi lokal dari sandbox AI face attendance yang sekarang sudah dibawa masuk ke repo VISIATTEND supaya lebih mudah dijalankan dan tidak bergantung ke folder luar.

Struktur utama:

- `app/` berisi kode Python untuk deteksi, embedding, bridge backend, dan command line flow
- `models/` untuk model YuNet dan ArcFace ONNX
- `storage/` untuk user embeddings dan log attendance
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

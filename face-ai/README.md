# face-ai

Folder ini berisi pipeline AI wajah yang sekarang dipakai langsung oleh backend Node.js di project VISIATTEND.

Komponen utamanya:

- `app/detector.py` untuk deteksi wajah dengan YuNet
- `app/embedder.py` untuk embedding wajah dengan ArcFace ONNX
- `app/store.py` untuk penyimpanan sample wajah dan log absensi
- `app/backend_bridge.py` untuk jembatan antara Node.js dan Python
- `app/main.py` untuk uji lokal manual dari terminal

## Setup

```powershell
cd E:\CAPSTONE\BE\VISIATTEND\face-ai
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app\main.py setup-models
```

## Catatan

- Backend Node.js secara default akan mencari Python executable di `face-ai\venv\Scripts\python.exe`
- Model akan disimpan di folder `face-ai\models`
- Data wajah user akan disimpan di folder `face-ai\storage\users`
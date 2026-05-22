# Panduan Face Attendance Untuk Pemula

Dokumen ini menjelaskan flow dasar AI face attendance yang sekarang dipakai di VISIATTEND.

Arsitektur yang dipakai:

```text
Frontend VISIATTEND -> Express/TypeScript -> Python Face AI Bridge
```

Bridge Python dipakai untuk 3 hal utama:

1. `capture-registration`
2. `finalize-registration`
3. `verify`

Command setup cepat:

```powershell
cd E:\CAPSTONE\BEpy\VISIATTEND\face-ai
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app\main.py setup-models
```

Command manual yang berguna:

```powershell
python app\main.py register-camera
python app\main.py attendance-camera
python app\backend_bridge.py --help
```

Catatan:

- folder `models/`, `storage/`, `output/`, `samples/`, dan `venv/` di-ignore dari git
- backend VISIATTEND default mengarah ke folder AI lokal ini

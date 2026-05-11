# VISIATTEND Face Recognition Service

FastAPI service untuk face registration dan verification menggunakan DeepFace. Service ini berjalan di container Docker terpisah dan hanya diaktifkan ketika ada request dari backend Node.js.

---

## 📋 Requirements

- Python 3.11+
- Docker & Docker Compose (untuk production)
- 2GB RAM minimum (untuk DeepFace model)
- GPU optional (untuk faster processing)

---

## 🚀 Quick Start

### 1. Local Development (Tanpa Docker)

#### Setup Python Environment

```bash
# Buat virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Run Service

```bash
# Development mode (dengan auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Service akan running di: `http://localhost:8000`

### 2. Docker Setup

#### Build Image

```bash
docker build -t visiattend-face-service:latest .
```

#### Run Container

```bash
docker run -d \
  --name face-service \
  -p 8000:8000 \
  -v $(pwd)/storage:/app/storage \
  -v $(pwd)/logs:/app/logs \
  --env-file .env \
  visiattend-face-service:latest
```

#### Docker Compose (Recommended)

Tambahkan ini ke `docker-compose.yml` di root BE:

```yaml
face-service:
  build:
    context: ./face-service
    dockerfile: Dockerfile
  container_name: visiattend-face-service
  ports:
    - "8000:8000"
  environment:
    ENVIRONMENT: development
    DEBUG: "true"
    CONFIDENCE_THRESHOLD: "0.6"
  volumes:
    - ./face-service/storage:/app/storage
    - ./face-service/logs:/app/logs
  networks:
    - visiattend-network
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

---

## 📚 API Endpoints

### Health Check

**GET** `/health`

Cek status service dan model.

Response:
```json
{
  "status": "healthy",
  "service": "VISIATTEND Face Recognition Service",
  "timestamp": "2026-04-20T08:00:00.000Z",
  "model_loaded": true
}
```

### Face Registration

**POST** `/api/face/register`

Register wajah user baru.

Parameters:
- `user_id` (query, required): User ID
- `file` (body, required): Upload foto wajah (JPG, PNG, GIF)
- `device_info` (query, optional): Info perangkat

Request:
```bash
curl -X POST "http://localhost:8000/api/face/register?user_id=VST-001" \
  -F "file=@face.jpg" \
  -F "device_info=Samsung Galaxy S21"
```

Response:
```json
{
  "success": true,
  "message": "Face registered successfully",
  "data": {
    "user_id": "VST-001",
    "face_registered": true,
    "face_status": "ACTIVE",
    "confidence": 0.95,
    "timestamp": "2026-04-20T08:00:00.000Z"
  }
}
```

### Face Verification

**POST** `/api/face/verify`

Verify wajah untuk attendance check-in.

Parameters:
- `file` (body, required): Upload foto wajah
- `user_id` (query, optional): User ID untuk specific verification
- `device_info` (query, optional): Info perangkat

Request:
```bash
curl -X POST "http://localhost:8000/api/face/verify" \
  -F "file=@face.jpg" \
  -F "user_id=VST-001"
```

Response (Match):
```json
{
  "success": true,
  "message": "Face verification completed",
  "data": {
    "matched": true,
    "matched_user_id": "VST-001",
    "confidence": 0.92,
    "code": "FACE_MATCH",
    "timestamp": "2026-04-20T08:00:00.000Z"
  }
}
```

Response (Not Registered):
```json
{
  "success": true,
  "message": "Face verification completed",
  "data": {
    "matched": false,
    "matched_user_id": null,
    "confidence": 0.0,
    "code": "FACE_NOT_REGISTERED",
    "timestamp": "2026-04-20T08:00:00.000Z"
  }
}
```

### Check Registration Status

**GET** `/api/face/check-registration/{user_id}`

Cek apakah user sudah register wajah.

Request:
```bash
curl http://localhost:8000/api/face/check-registration/VST-001
```

Response:
```json
{
  "success": true,
  "data": {
    "user_id": "VST-001",
    "face_registered": true,
    "face_status": "ACTIVE"
  }
}
```

### Delete Face Profile

**DELETE** `/api/face/{user_id}`

Hapus profil wajah user.

Request:
```bash
curl -X DELETE http://localhost:8000/api/face/VST-001
```

Response:
```json
{
  "success": true,
  "message": "Face profile deleted for user VST-001"
}
```

---

## 🔄 Integration dengan Node.js Backend

### Di Backend Node.js, panggil face-service seperti ini:

```typescript
// services/FaceRecognitionService.ts
export class FaceRecognitionService {
  private baseUrl = process.env.FACE_SERVICE_URL || 'http://face-service:8000';

  async registerFace(userId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(
      `${this.baseUrl}/api/face/register?user_id=${userId}`,
      { method: 'POST', body: formData }
    );
    
    return response.json();
  }

  async verifyFace(file: File, userId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    
    let url = `${this.baseUrl}/api/face/verify`;
    if (userId) url += `?user_id=${userId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    return response.json();
  }

  async checkRegistration(userId: string) {
    const response = await fetch(
      `${this.baseUrl}/api/face/check-registration/${userId}`
    );
    return response.json();
  }
}
```

---

## 📊 Response Codes untuk Flutter

Frontend harus mendengarkan field `code` di response:

| Code | Meaning | Flutter Action |
|------|---------|----------------|
| `FACE_MATCH` | Wajah cocok | Lanjut ke dashboard |
| `FACE_NOT_MATCH` | Wajah tidak cocok | Tampilkan error, retry |
| `FACE_NOT_REGISTERED` | User belum register wajah | Arahkan ke form registrasi |
| `FACE_NOT_DETECTED` | Tidak ada wajah di foto | Minta foto yang lebih jelas |
| `USER_NOT_FOUND` | User tidak ada di database | Tampilkan error |
| `ERROR` | Error internal | Retry atau hubungi admin |

---

## 🛠️ Configuration

Edit `.env` untuk mengubah behavior:

```bash
# Model sensitivity
CONFIDENCE_THRESHOLD=0.6        # 0-1, lebih kecil = lebih strict

# Face detection
FACE_DETECTION_BACKEND=opencv   # Bisa juga dlib, mtcnn, retinaface
ENFORCE_DETECTION=true          # Jika true, harus detect wajah

# Logging
LOG_LEVEL=INFO                  # DEBUG, INFO, WARNING, ERROR
```

---

## 📁 Storage Structure

```
face-service/
├── app/
│   ├── main.py
│   ├── face_recognition.py
│   ├── models.py
│   ├── config.py
│   └── __init__.py
├── storage/                    # Tempat simpan embedding
│   ├── VST-001_embedding.json
│   ├── VST-002_embedding.json
│   └── ...
├── logs/
│   └── face_service.log
├── requirements.txt
├── Dockerfile
├── .env
└── README.md
```

---

## 🔍 Troubleshooting

### Model takes long to load

- Pastikan RAM cukup (2GB minimum)
- Untuk production, gunakan GPU (NVIDIA CUDA)

### Certificate verification failed

Jika di Windows lokal, bisa disable verification di .env:
```bash
VERIFY_CERT=false
```

### Out of memory

Kurangi confidence threshold atau scale down image sebelum kirim.

### Slow verification

- Cek CPU/RAM usage
- Pertimbangkan gunakan GPU
- Scale down image size jika terlalu besar

---

## 📝 Logging

Log disimpan di `logs/face_service.log`

```bash
# Tail log real-time
tail -f logs/face_service.log

# Filter by level
grep ERROR logs/face_service.log
```

---

## ✅ Checklist Deployment

- [ ] Requirements terinstall: `pip install -r requirements.txt`
- [ ] `.env` sudah dikonfigurasi
- [ ] Folder `storage/` readable & writable
- [ ] Folder `logs/` readable & writable
- [ ] Port 8000 tidak ada yang pakai
- [ ] Backend Node.js tahu URL service (FACE_SERVICE_URL env var)
- [ ] CORS dikonfigurasi dengan benar di main.py
- [ ] Health endpoint bisa di-access: `curl http://localhost:8000/health`

---

## 📖 API Documentation (Interactive)

Setelah service running, buka dokumentasi interaktif:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## 🤝 Integration dengan Docker Compose

Ketika sudah di docker-compose, akses service dari Node.js:

```typescript
const FACE_SERVICE_URL = 'http://face-service:8000';
```

(Bukan `localhost`, karena container internal network)

---

## 📄 License

Copyright VISIATTEND Team 2026

---

## 🆘 Support

Untuk masalah atau pertanyaan:
1. Baca error message di log
2. Check `.env` configuration
3. Pastikan DeepFace model sudah loaded (`GET /health`)
4. Hubungi tech lead team

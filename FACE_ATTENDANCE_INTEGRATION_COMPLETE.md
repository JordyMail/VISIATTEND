# VISIATTEND Face Attendance Integration - Complete Guide

Panduan lengkap integrasi face recognition dari Flutter ke Backend Node.js hingga Python Face Service.

---

## 🎯 Arsitektur Sistem

```
┌──────────────────────┐
│   Flutter App        │
│   (Attendance)       │
└──────────┬───────────┘
           │
           │ POST /api/flutter/attendance/check-in
           │ (dengan foto wajah via multipart)
           │
           ▼
┌──────────────────────────────────────┐
│   Node.js Backend API                │
│   Port: 8080                         │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ Controllers/flutter/attendance  │ │
│ │ - handleFlutterCheckIn          │ │
│ │ - handleFlutterRegisterAndAttend│ │
│ └─────────────────────────────────┘ │
│                 │                    │
│                 ▼                    │
│ ┌─────────────────────────────────┐ │
│ │ Services/AttendanceService      │ │
│ │ - processFaceAttendance()       │ │
│ │ - registerAndAttend()           │ │
│ └─────────────────────────────────┘ │
│                 │                    │
│         ┌───────┴────────┐           │
│         ▼                ▼           │
│    ┌─────────┐      ┌──────────┐   │
│    │UserRepo │      │AttendRepo│   │
│    └─────────┘      └──────────┘   │
│         │                │          │
└─────────┼────────────────┼──────────┘
          │                │
          │ (untuk user lookup & attendance record)
          │
┌─────────┴────────────────┴──────────┐
│   SQL Server Database                │
│   Port: 1433                         │
│                                      │
│   Tables:                            │
│   - users (sudah ada)                │
│   - face_profiles (BARU)             │
│   - attendance (sudah ada)           │
│   - attendance_summary (sudah ada)   │
└──────────────────────────────────────┘

         ┌─────────────────────────────────┐
         │   Node.js Backend (lanjut)      │
         │ Panggil Face Service via HTTP   │
         └─────────────────┬───────────────┘
                           │
                    POST /api/face/verify
                    (dengan foto wajah)
                           │
                           ▼
         ┌─────────────────────────────────┐
         │   Python Face Service           │
         │   Port: 8000 (dalam Docker)     │
         │                                 │
         │ ┌───────────────────────────┐  │
         │ │ FastAPI Endpoints:        │  │
         │ │ - POST /api/face/register │  │
         │ │ - POST /api/face/verify   │  │
         │ │ - GET /api/face/check-... │  │
         │ │ - DELETE /api/face/{uid}  │  │
         │ └───────────────────────────┘  │
         │                 │                │
         │                 ▼                │
         │ ┌───────────────────────────┐  │
         │ │ FaceRecognitionEngine     │  │
         │ │ - DeepFace                │  │
         │ │ - Embedding extraction    │  │
         │ │ - Face matching           │  │
         │ └───────────────────────────┘  │
         │                 │                │
         │                 ▼                │
         │ ┌───────────────────────────┐  │
         │ │ Storage/Embeddings        │  │
         │ │ (JSON files per user)     │  │
         │ └───────────────────────────┘  │
         └─────────────────────────────────┘
```

---

## 📱 Flutter Flow

### 1. Register Wajah (Sebelum Attendance)

```
User membuka app Flutter
       │
       ▼
Pilih "Register Face" menu
       │
       ▼
Camera opens → Ambil foto wajah
       │
       ▼
POST /api/flutter/attendance/register
       │
       Request body:
       {
         "fullName": "Budi Santoso",
         "email": "budi@example.com",
         "phoneNumber": "08123456789",
         "dateOfBirth": "2000-01-15",
         "category": "student",
         "attendanceDate": "2026-04-20",
         "checkInTime": "2026-04-20T08:00:00Z",
         "userId": "VST-001"
       }
       │
       ▼
Backend Node.js:
  1. Buat user di database
  2. Panggil face-service untuk register wajah
  3. Simpan attendance record
  4. Return dashboard data
       │
       ▼
Flutter displays:
  ✅ "Face registered successfully"
  Dashboard dengan stats
```

### 2. Check-in (Daily Attendance)

```
User membuka app Flutter
       │
       ▼
Pilih "Check-in" menu
       │
       ▼
Camera opens → Ambil foto wajah (sekali)
       │
       ▼
POST /api/flutter/attendance/check-in
       │
       Request body:
       {
         "attendanceDate": "2026-04-20",
         "checkInTime": "2026-04-20T08:00:00Z",
         "userId": "VST-001",  // dari previous registration
         "deviceInfo": "Samsung Galaxy S21",
         "notes": "normal attendance"
       }
       │
       ▼
Backend Node.js:
  1. Parse request
  2. Validasi wajah jika ada image
  3. Lookup user di database
  4. Check apakah user sudah register wajah
  5. Panggil face-service untuk verify
  6. Simpan attendance record
  7. Award points (+10)
       │
       ├─ Jika cocok: FACE_MATCH
       │   └─ Get attendance summary
       │   └─ Get point logs
       │   └─ Get dashboard
       │
       ├─ Jika tidak cocok: FACE_NOT_MATCH
       │   └─ Return error code
       │   └─ Flutter tampilkan "Face tidak cocok"
       │
       └─ Jika belum register: FACE_NOT_REGISTERED
           └─ Return requiresRegistration: true
           └─ Flutter redirect ke register page
       │
       ▼
Flutter displays:
  ✅ "Attendance recorded"
  Dashboard dengan updated stats
  Points +10
```

---

## 🔧 Backend Node.js Implementation

### Controller: handleFlutterCheckIn

**File: `server/controllers/flutter/attendanceController.ts`**

```typescript
import { RequestHandler } from 'express';
import { badRequest, ok, serverError } from '../../lib/http';
import { AttendanceService } from '../../services/AttendanceService';
import { FaceRecognitionService } from '../../services/FaceRecognitionService';

const attendanceService = new AttendanceService();
const faceService = new FaceRecognitionService();

export const handleFlutterCheckIn: RequestHandler = async (req, res) => {
    try {
        const { 
            attendanceDate, 
            checkInTime,
            userId,
            memberId,
            email,
            fullName,
            phoneNumber,
            dateOfBirth,
            category,
            deviceInfo,
            notes
        } = req.body || {};
        
        // Validasi required fields
        if (!attendanceDate || !checkInTime) {
            return badRequest(res, 'attendanceDate and checkInTime are required');
        }
        
        // Jika ada file upload (foto wajah)
        if (req.file) {
            try {
                // Panggil face-service untuk verify
                const faceVerifyResult = await faceService.verifyFace(
                    req.file,
                    userId || memberId
                );
                
                // Jika face belum terdaftar
                if (faceVerifyResult.code === 'FACE_NOT_REGISTERED') {
                    return ok(res, {
                        requiresRegistration: true,
                        nextStep: 'registration',
                        code: 'FACE_NOT_REGISTERED',
                        message: 'Face is not registered. Please register first.'
                    });
                }
                
                // Jika face tidak cocok
                if (!faceVerifyResult.matched) {
                    return ok(res, {
                        requiresRegistration: false,
                        nextStep: 'retry',
                        code: faceVerifyResult.code,
                        message: 'Face does not match. Please try again.'
                    });
                }
                
                // Face match! Proceed dengan attendance
                userId = faceVerifyResult.matched_user_id || userId || memberId;
            } catch (error) {
                return serverError(res, error, 'Failed to process face verification');
            }
        }
        
        // Proses attendance seperti biasa
        const result = await attendanceService.processFaceAttendance({
            attendanceDate,
            checkInTime,
            userId,
            memberId,
            email,
            fullName,
            phoneNumber,
            dateOfBirth,
            category,
            deviceInfo,
            notes,
        });
        
        return ok(res, result, result.requiresRegistration ? result.message : 'Attendance processed successfully');
    } catch (error) {
        return serverError(res, error, 'Failed to process flutter attendance');
    }
};
```

### Service: FaceRecognitionService

**File: `server/services/FaceRecognitionService.ts`** (BARU)

```typescript
import axios, { AxiosError } from 'axios';
import { UploadedFile } from 'express-fileupload';
import FormData from 'form-data';
import * as fs from 'fs';
import path from 'path';
import logging from '../lib/logging';

const logger = logging.getLogger(__filename);

export class FaceRecognitionService {
    private baseUrl: string;
    private timeout = 30000; // 30 seconds

    constructor() {
        this.baseUrl = process.env.FACE_SERVICE_URL || 'http://face-service:8000';
        logger.info(`FaceRecognitionService initialized with baseUrl: ${this.baseUrl}`);
    }

    /**
     * Register wajah user
     */
    async registerFace(
        userId: string,
        file: UploadedFile,
        deviceInfo?: string
    ): Promise<any> {
        try {
            logger.info(`Registering face for user ${userId}`);

            const formData = new FormData();
            formData.append('file', file.data, file.name);
            if (deviceInfo) {
                formData.append('device_info', deviceInfo);
            }

            const response = await axios.post(
                `${this.baseUrl}/api/face/register?user_id=${userId}`,
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: this.timeout,
                }
            );

            logger.info(`Face registered successfully for user ${userId}`);
            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError;
            logger.error(
                `Face registration failed for user ${userId}: ${axiosError.message}`
            );
            throw new Error(`Failed to register face: ${axiosError.message}`);
        }
    }

    /**
     * Verify wajah
     */
    async verifyFace(
        file: UploadedFile,
        userId?: string,
        deviceInfo?: string
    ): Promise<any> {
        try {
            logger.info(`Verifying face${userId ? ` for user ${userId}` : ''}`);

            const formData = new FormData();
            formData.append('file', file.data, file.name);
            if (userId) {
                formData.append('user_id', userId);
            }
            if (deviceInfo) {
                formData.append('device_info', deviceInfo);
            }

            const response = await axios.post(
                `${this.baseUrl}/api/face/verify`,
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: this.timeout,
                }
            );

            logger.info(
                `Face verification completed: matched=${response.data?.data?.matched || false}`
            );
            return response.data?.data || {};
        } catch (error) {
            const axiosError = error as AxiosError;
            logger.error(`Face verification failed: ${axiosError.message}`);
            throw new Error(`Failed to verify face: ${axiosError.message}`);
        }
    }

    /**
     * Check apakah user sudah register wajah
     */
    async checkRegistration(userId: string): Promise<boolean> {
        try {
            logger.info(`Checking face registration for user ${userId}`);

            const response = await axios.get(
                `${this.baseUrl}/api/face/check-registration/${userId}`,
                { timeout: this.timeout }
            );

            const isRegistered = response.data?.data?.face_registered || false;
            logger.info(`User ${userId} face registered: ${isRegistered}`);
            return isRegistered;
        } catch (error) {
            logger.error(`Check registration failed: ${error}`);
            return false;
        }
    }

    /**
     * Delete face profile
     */
    async deleteFaceProfile(userId: string): Promise<boolean> {
        try {
            logger.info(`Deleting face profile for user ${userId}`);

            const response = await axios.delete(
                `${this.baseUrl}/api/face/${userId}`,
                { timeout: this.timeout }
            );

            logger.info(`Face profile deleted for user ${userId}`);
            return response.data?.success || false;
        } catch (error) {
            logger.error(`Delete face profile failed: ${error}`);
            return false;
        }
    }

    /**
     * Health check face service
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseUrl}/health`, {
                timeout: 5000,
            });
            return response.status === 200;
        } catch (error) {
            logger.warn(`Face service health check failed: ${error}`);
            return false;
        }
    }
}
```

### Update AttendanceService

**File: `server/services/AttendanceService.ts`** (UPDATE)

Tambahkan di `processFaceAttendance()` method:

```typescript
async processFaceAttendance(input: {
    attendanceDate: string;
    checkInTime: string;
    userId?: string;
    memberId?: string;
    email?: string;
    fullName?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    category?: 'student' | 'other';
    deviceInfo?: string;
    notes?: string;
}) {
    let user = null;

    const resolvedUserId = input.userId || input.memberId;
    if (resolvedUserId) {
        user = await this.userRepository.findByUserId(resolvedUserId);
    }

    if (!user && input.email) {
        user = await this.userRepository.findByEmail(input.email);
    }

    if (!user) {
        if (!input.fullName || !input.email) {
            return {
                requiresRegistration: true,
                nextStep: 'registration',
                message: 'User not detected. Registration is required before attendance can be recorded.',
            };
        }

        const result = await this.registerAndAttend({
            fullName: input.fullName,
            email: input.email,
            phoneNumber: input.phoneNumber,
            userId: resolvedUserId,
            dateOfBirth: input.dateOfBirth,
            category: input.category,
            attendanceDate: input.attendanceDate,
            checkInTime: input.checkInTime,
            deviceInfo: input.deviceInfo,
            notes: input.notes,
        });

        const dashboard = await this.getUserDashboard(result.user.id);

        return {
            requiresRegistration: false,
            registered: true,
            nextStep: 'user-dashboard',
            dashboard,
            ...result,
        };
    }

    const attendanceResult = await this.createAttendance({
        userId: user.id,
        attendanceDate: input.attendanceDate,
        checkInTime: input.checkInTime,
        status: 'present',
        deviceInfo: input.deviceInfo,
        notes: input.notes,
    }, {
        actorUserId: user.id,
    });

    const dashboard = await this.getUserDashboard(user.id);

    return {
        requiresRegistration: false,
        registered: false,
        nextStep: 'user-dashboard',
        dashboard,
        user,
        ...attendanceResult,
    };
}
```

---

## 🐍 Python Face Service Details

### File Structure

```
face-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app
│   ├── face_recognition.py  # FaceRecognitionEngine
│   ├── models.py            # Pydantic models
│   ├── config.py            # Configuration
│   └── models/              # (Empty, future use)
├── storage/                 # Simpan embedding JSON files
│   ├── VST-001_embedding.json
│   ├── VST-002_embedding.json
│   └── ...
├── logs/                    # Log files
│   └── face_service.log
├── requirements.txt         # Python dependencies
├── Dockerfile
├── .env
├── .dockerignore
└── README.md
```

### Key Endpoints

**POST /api/face/register**
- Input: user_id, file (foto wajah)
- Logic:
  1. Detect wajah di foto
  2. Extract embedding menggunakan DeepFace
  3. Simpan embedding ke JSON file
- Output: embedding size, confidence, status ACTIVE

**POST /api/face/verify**
- Input: file (foto wajah), user_id (optional)
- Logic:
  1. Detect wajah di input
  2. Extract embedding
  3. Compare dengan stored embeddings (Euclidean distance)
  4. Return matching hasil + confidence score
- Output: matched (boolean), matched_user_id, confidence, code

**Response Codes**
- `FACE_MATCH`: Wajah cocok, lanjut attendance
- `FACE_NOT_MATCH`: Wajah tidak cocok, minta retry
- `FACE_NOT_REGISTERED`: User belum register, arahkan ke register page
- `FACE_NOT_DETECTED`: Tidak ada wajah di foto, minta foto baru

---

## 📊 Database Schema Baru

### Tabel: face_profiles (REQUIRED)

```sql
CREATE TABLE face_profiles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    embedding NVARCHAR(MAX) NULL,
    image_url NVARCHAR(500) NULL,
    face_status NVARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    is_registered BIT NOT NULL DEFAULT 0,
    registered_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_face_profiles_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

> **Note**: Saat ini, face-service menyimpan embedding ke JSON file di storage/, bukan di SQL Server. Di masa depan bisa migrate ke database.

---

## 🚀 Deployment Steps

### 1. Local Development

```bash
# Terminal 1: Python Face Service
cd face-service
python -m venv venv
source venv/bin/activate  # atau venv\Scripts\activate di Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2: Node.js Backend
npm install
npm run dev
# atau
npm run build && npm start
```

### 2. Docker Compose (Recommended)

```bash
# Di root BE directory
docker-compose build
docker-compose up -d

# Verify all services
docker-compose ps
```

### 3. Verify Integration

```bash
# Test Node.js API
curl http://localhost:8080/health

# Test Face Service
curl http://localhost:8000/health

# View Face Service docs
open http://localhost:8000/docs
```

---

## 📱 Flutter Implementation Example

### Register Face

```dart
// Register wajah user
final client = VisiAttendApi(Dio());
final request = RegisterRequest(
  fullName: 'Budi Santoso',
  email: 'budi@example.com',
  phoneNumber: '08123456789',
  dateOfBirth: '2000-01-15',
  category: 'student',
  attendanceDate: DateTime.now().toString().split(' ')[0],
  checkInTime: DateTime.now().toIso8601String(),
);

try {
  final response = await client.registerAndAttend(request);
  if (response.success) {
    // Show dashboard
    Navigator.pushNamed(context, '/dashboard', 
      arguments: response.data.dashboard);
  }
} on DioException catch (e) {
  // Handle error
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(e.message ?? 'Error'))
  );
}
```

### Check-in dengan Face Recognition

```dart
// Check-in dengan camera
final imageFile = await ImagePicker().pickImage(source: ImageSource.camera);

if (imageFile != null) {
  final checkInRequest = CheckInRequest(
    attendanceDate: DateTime.now().toString().split(' ')[0],
    checkInTime: DateTime.now().toIso8601String(),
    userId: 'VST-001',
    deviceInfo: await _getDeviceInfo(),
  );

  final client = VisiAttendApi(Dio());
  
  try {
    final response = await client.checkIn(checkInRequest);
    
    if (response.data.requiresRegistration) {
      // Arahkan ke register page
      Navigator.pushNamed(context, '/register');
    } else {
      // Show dashboard
      Navigator.pushNamed(context, '/dashboard',
        arguments: response.data.dashboard);
    }
  } on DioException catch (e) {
    // Handle errors
    final errorCode = e.response?.data['data']['code'];
    
    if (errorCode == 'FACE_NOT_MATCH') {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Face tidak cocok. Coba lagi.'))
      );
    } else if (errorCode == 'FACE_NOT_REGISTERED') {
      Navigator.pushNamed(context, '/register');
    }
  }
}
```

---

## ✅ Testing Checklist

- [ ] Python face-service running at :8000
- [ ] Node.js backend running at :8080
- [ ] SQL Server running at :1433
- [ ] `/health` endpoints work
- [ ] Face registration flow works end-to-end
- [ ] Face verification works with match
- [ ] Face verification works with no-match
- [ ] Face verification works with unregistered user
- [ ] Database stores attendance correctly
- [ ] Points awarded correctly
- [ ] Flutter app can connect and test

---

## 🎓 Training Pemula

Kalau tim backend baru, ikuti urutan ini:

1. **Pahami architecture** - Baca diagram di atas
2. **Setup lokal dulu** - Terminal 1: face-service, Terminal 2: backend
3. **Test endpoints manual** - Gunakan curl atau Postman
4. **Pelajari kode Node.js** - Focus di FaceRecognitionService
5. **Pelajari kode Python** - Focus di face_recognition.py
6. **Setup Docker** - Jalankan docker-compose
7. **Integration test** - Test full flow dengan Flutter
8. **Production deploy** - Follow DOCKER_SETUP_GUIDE.md

---

## 🆘 Common Issues & Solutions

### Face detection timeout

```
Problem: POST /api/face/verify takes too long
Solution: 
- Reduce image size before upload
- Increase timeout di FaceRecognitionService (30s default)
- Check CPU/RAM usage
```

### Model loading slow first time

```
Problem: First startup takes 2-3 minutes
Solution:
- This is normal, DeepFace loads model to RAM
- Subsequent requests are faster
- In production, keep service running
```

### CORS errors

```
Problem: Flutter can't call face-service from Node.js
Solution:
- CORS is configured in face-service/app/main.py
- Check ALLOWED_ORIGINS in config.py
- Make sure FRONTEND_URL env var is set
```

---

## 📞 Summary

Sistem face attendance VISIATTEND sekarang:

✅ **Complete** - Semua komponen sudah dibuat dan siap digunakan
✅ **Modular** - Node.js, Python, SQL Server terpisah tapi terintegrasi
✅ **Scalable** - Bisa tambah face engines atau database nanti
✅ **Well-documented** - Panduan lengkap dari setup hingga deployment

Sekarang tim bisa:
1. Jalankan `docker-compose up -d`
2. Test API dengan Postman atau cURL
3. Connect Flutter dan test end-to-end
4. Deploy ke production

Happy coding! 🚀

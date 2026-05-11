# Face Attendance Integration Guide

Panduan ini menjelaskan di mana integrasi face recognition paling tepat dimasukkan ke backend Node.js VISIATTEND, perubahan API yang perlu disepakati dengan Flutter, struktur database SQL Server yang disarankan, dan setup Docker untuk pemula.

---

## 1. Kondisi Backend Saat Ini

Backend saat ini sudah punya flow Flutter attendance, tetapi belum benar-benar melakukan face recognition di sisi server.

Titik yang sudah ada:

- `server/routes/flutter/attendance.ts`
  - Route `POST /api/flutter/attendance/check-in`
  - Route `POST /api/flutter/attendance/register`
- `server/controllers/flutter/attendanceController.ts`
  - Validasi request Flutter attendance
  - Meneruskan request ke service
- `server/services/AttendanceService.ts`
  - `processFaceAttendance()`
  - `registerAndAttend()`
  - `createAttendance()`
- `server/db/repositories/UserRepository.ts`
  - Lookup user by `user_id` dan `email`
- `server/db/repositories/AttendanceRepository.ts`
  - Simpan data absensi ke SQL Server
- `server/db/schema.sql`
  - Sudah ada tabel `users`, `attendance`, `attendance_summary`, `point_logs`

### Kesimpulan penting

Flow yang ada sekarang masih menganggap identitas user sudah diketahui dari Flutter, misalnya lewat `userId`, `memberId`, atau `email`.

Artinya, backend saat ini belum punya kemampuan:

- menyimpan profil wajah user,
- mencocokkan foto wajah saat check-in,
- memberi status "wajah belum terdaftar" berdasarkan data biometrik,
- memisahkan status "user ada tapi wajah belum register" dengan status "wajah tidak cocok".

---

## 2. Tempat Integrasi yang Paling Tepat

### Rekomendasi utama

Jangan taruh logic DeepFace atau model Python langsung di controller.
Taruh integrasi di layer service.

### Posisi yang direkomendasikan

1. `server/controllers/flutter/attendanceController.ts`
   - tetap jadi pintu masuk request dari Flutter
   - hanya parsing request dan memanggil service

2. `server/services/AttendanceService.ts`
   - tetap jadi orchestrator utama flow attendance Flutter
   - di sinilah pengecekan user, status wajah, dan pencatatan absensi digabung

3. Tambah service baru, misalnya:
   - `server/services/FaceRecognitionService.ts`
   - tanggung jawabnya memanggil face engine / face microservice

4. Tambah repository baru, misalnya:
   - `server/db/repositories/FaceProfileRepository.ts`
   - untuk baca/tulis data wajah user di SQL Server

### Kenapa ini posisi terbaik

Karena backend Anda sudah memakai pola route -> controller -> service -> repository.
Jadi integrasi wajah sebaiknya ikut pola yang sama agar:

- controller tetap tipis,
- logika bisnis tetap terpusat,
- database tetap di repository,
- nanti mudah dites dan di-maintain.

---

## 3. Perubahan Kontrak API yang Wajib Dibahas dengan Tim BE

Dokumentasi API saat ini belum cukup untuk backend melakukan face recognition sendiri.
Endpoint `POST /api/flutter/attendance/check-in` sekarang hanya menerima data teks seperti:

- `userId`
- `memberId`
- `email`
- `fullName`
- `phoneNumber`

Kalau backend yang melakukan face recognition, maka Flutter harus mengirim salah satu dari ini:

1. foto wajah mentah,
2. base64 image,
3. multipart file upload,
4. atau token hasil upload file ke storage.

### Rekomendasi paling aman untuk pemula

Ubah `POST /api/flutter/attendance/check-in` menjadi menerima `multipart/form-data`.

Field minimum yang dikirim Flutter:

- `attendanceDate`
- `checkInTime`
- `deviceInfo`
- `notes` opsional
- `faceImage` sebagai file upload
- `userId` opsional jika sudah ada identitas awal

### Endpoint tambahan yang disarankan

#### A. Register wajah

`POST /api/flutter/attendance/face/register`

Tujuan:
- menyimpan data wajah untuk user yang sudah punya akun
- dipakai sesudah user registrasi selesai atau dari halaman profil

Request:
- `userId`
- `faceImage`

Response contoh:

```json
{
  "success": true,
  "message": "Face profile registered successfully",
  "data": {
    "userId": "VST-001",
    "faceRegistered": true,
    "faceStatus": "ACTIVE"
  }
}
```

#### B. Cek status registrasi wajah

`GET /api/flutter/attendance/face-status/:userId`

Tujuan:
- Flutter bisa tahu apakah user sudah punya wajah terdaftar
- cocok untuk halaman profil atau pre-check sebelum check-in

Response contoh:

```json
{
  "success": true,
  "data": {
    "userId": "VST-001",
    "faceRegistered": false,
    "faceStatus": "NOT_REGISTERED"
  }
}
```

#### C. Check-in berbasis foto wajah

`POST /api/flutter/attendance/check-in`

Response scenario yang lebih jelas:

1. `FACE_NOT_REGISTERED`
2. `FACE_NOT_MATCH`
3. `USER_NOT_FOUND`
4. `ATTENDANCE_SUCCESS`

Contoh response saat wajah belum terdaftar:

```json
{
  "success": true,
  "message": "Face is not registered",
  "data": {
    "requiresRegistration": true,
    "nextStep": "registration",
    "code": "FACE_NOT_REGISTERED",
    "faceRegistered": false
  }
}
```

---

## 4. Catatan Penting untuk Dokumentasi API Sekarang

Ada beberapa hal yang perlu dirapikan sebelum Anda sampaikan ke tim backend:

### A. `check-in` saat ini belum membawa payload biometrik

Kalau backend yang akan memverifikasi wajah, request body sekarang belum cukup.
Karena tidak ada field gambar atau embedding.

### B. Arti field `registered` dan `isNew` masih ambigu

Di skenario dokumentasi sekarang ada kondisi seperti:

- user ditemukan,
- tetapi `registered: false`,
- dan `isNew: true`

Ini membingungkan.

Saran:
- `registered` dipakai khusus untuk status apakah user baru dibuat pada request ini
- `faceRegistered` dipakai khusus untuk status profil wajah
- `isNewUser` dipakai khusus untuk user yang baru terdaftar

### C. `requiresRegistration` perlu dipisah maknanya

Saat ini `requiresRegistration` bisa berarti:
- user belum ada,
- user ada tapi wajah belum ada,
- data Flutter belum cukup.

Sebaiknya backend menambahkan field `code` agar Flutter bisa membedakan kondisi.

Contoh:

- `USER_NOT_FOUND`
- `FACE_NOT_REGISTERED`
- `INSUFFICIENT_IDENTITY_DATA`
- `FACE_NOT_MATCH`
- `ATTENDANCE_SUCCESS`

---

## 5. Desain Database SQL Server yang Disarankan

Tabel yang sekarang belum punya tempat untuk data wajah.
Saran minimal: tambahkan tabel `face_profiles`.

```sql
CREATE TABLE face_profiles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    embedding NVARCHAR(MAX) NULL,
    image_url NVARCHAR(500) NULL,
    face_status NVARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    is_registered BIT NOT NULL DEFAULT 0,
    registered_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_face_profiles_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT UQ_face_profiles_user UNIQUE (user_id),
    CONSTRAINT CK_face_profiles_status CHECK (face_status IN ('ACTIVE', 'NOT_REGISTERED', 'DISABLED', 'PENDING_REVIEW'))
);

CREATE INDEX idx_face_profiles_user ON face_profiles(user_id);
```

### Opsional tapi sangat disarankan: log verifikasi

```sql
CREATE TABLE face_verification_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NULL,
    verification_code NVARCHAR(50) NOT NULL,
    confidence_score DECIMAL(5,2) NULL,
    is_match BIT NOT NULL DEFAULT 0,
    image_url NVARCHAR(500) NULL,
    device_info NVARCHAR(255) NULL,
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_face_verification_logs_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### Cara backend menentukan status

- user tidak ada di `users` -> `USER_NOT_FOUND`
- user ada tapi tidak ada row di `face_profiles` -> `FACE_NOT_REGISTERED`
- user ada, row ada, `is_registered = 0` -> `FACE_NOT_REGISTERED`
- user ada, wajah ada, hasil match gagal -> `FACE_NOT_MATCH`
- user ada, wajah ada, hasil match sukses -> lanjut `ATTENDANCE_SUCCESS`

---

## 6. Rekomendasi Arsitektur untuk Pemula

### Pilihan terbaik untuk pemula

Pisahkan Node.js backend dan Python face engine menjadi 2 service.

Jangan langsung memaksa semua logic DeepFace masuk ke Node.js.
Karena yang sudah Anda punya saat ini untuk face processing berasal dari Python, dan itu jauh lebih mudah dijadikan service terpisah.

### Arsitektur yang disarankan

- Flutter
  - kirim request ke Node.js API
- Node.js API
  - autentikasi, business logic, SQL Server, response ke Flutter
- Python Face Service
  - register wajah
  - extract embedding
  - verify wajah
- SQL Server
  - simpan user, attendance, face_profiles
- Storage lokal / object storage
  - simpan file gambar jika diperlukan

### Kenapa ini paling aman

- backend utama tetap konsisten di Node.js,
- logic AI/vision tetap di Python,
- Docker lebih mudah karena tiap service punya tanggung jawab jelas,
- tim BE tidak perlu mem-porting DeepFace ke Node.js.

---

## 7. Posisi Folder yang Disarankan

Di repo Node.js, struktur yang cocok misalnya:

```text
VISIATTEND/
  client/
  server/
    controllers/
    db/
    lib/
    routes/
    services/
      AttendanceService.ts
      FaceRecognitionService.ts
  face-service/
    app/
      main.py
      requirements.txt
      storage/
  docker/
    sqlserver/
  docker-compose.yml
  Dockerfile
```

### Penempatan komponen

- `server/` = backend Node.js utama
- `face-service/` = service Python khusus wajah
- `docker-compose.yml` = orkestrasi semua container
- `Dockerfile` = build backend Node.js

---

## 8. Flow yang Disarankan

### A. Register user + register wajah

1. Flutter kirim data registrasi user ke Node.js
2. Node.js buat user di SQL Server
3. Flutter upload foto wajah ke Node.js atau langsung ke endpoint face register
4. Node.js memanggil Python face service
5. Python face service buat embedding
6. Node.js simpan hasil embedding ke `face_profiles`
7. Flutter mendapat response bahwa wajah sudah terdaftar

### B. Check-in

1. Flutter ambil foto wajah
2. Flutter kirim foto ke Node.js endpoint check-in
3. Node.js validasi request
4. Node.js panggil `FaceRecognitionService`
5. `FaceRecognitionService` kirim foto ke Python face service
6. Python face service mengembalikan hasil:
   - matched / not matched
   - matched user id atau candidate
   - confidence score
7. Node.js cek `users` dan `face_profiles`
8. Node.js simpan attendance jika valid
9. Node.js kembalikan response final ke Flutter

---

## 9. Node.js: Service yang Perlu Ditambah

### A. FaceRecognitionService

Contoh tanggung jawab:

- upload foto ke face engine,
- request register wajah,
- request verify wajah,
- handle timeout dan error.

Contoh sederhana:

```ts
import axios from 'axios';

export class FaceRecognitionService {
  private baseUrl = process.env.FACE_SERVICE_URL || 'http://face-service:8000';

  async registerFace(payload: FormData) {
    const response = await axios.post(`${this.baseUrl}/face/register`, payload, {
      headers: payload.getHeaders?.(),
      timeout: 30000,
    });

    return response.data;
  }

  async verifyFace(payload: FormData) {
    const response = await axios.post(`${this.baseUrl}/face/verify`, payload, {
      headers: payload.getHeaders?.(),
      timeout: 30000,
    });

    return response.data;
  }
}
```

### B. FaceProfileRepository

Contoh tanggung jawab:

- cari profil wajah by `user_id`
- insert profil wajah
- update embedding dan status
- cek apakah wajah terdaftar

---

## 10. Python Face Service yang Disarankan

Karena Anda sudah punya Python code untuk wajah, paling mudah buat service FastAPI terpisah.

Endpoint minimal:

### `POST /face/register`
Input:
- `userId`
- file foto

Output:
- `embedding`
- `faceDetected`
- `faceRegistered`

### `POST /face/verify`
Input:
- file foto
- opsional `userId`

Output:
- `matched`
- `matchedUserId`
- `confidence`
- `code`

Contoh response verify:

```json
{
  "matched": false,
  "matchedUserId": null,
  "confidence": 42.15,
  "code": "FACE_NOT_MATCH"
}
```

---

## 11. Docker untuk Pemula

### Service yang dibutuhkan

1. `api`
   - Node.js backend
2. `face-service`
   - Python FastAPI + DeepFace
3. `sqlserver`
   - Microsoft SQL Server

### docker-compose.yml contoh dasar

```yaml
version: '3.9'
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '8080:8080'
    env_file:
      - .env
    environment:
      DB_HOST: sqlserver
      DB_PORT: 1433
      FACE_SERVICE_URL: http://face-service:8000
    depends_on:
      - sqlserver
      - face-service

  face-service:
    build:
      context: ./face-service
      dockerfile: Dockerfile
    ports:
      - '8000:8000'
    volumes:
      - ./face-service/storage:/app/storage

  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: visiattend-sqlserver
    environment:
      ACCEPT_EULA: 'Y'
      MSSQL_SA_PASSWORD: 'TempPass!2026'
    ports:
      - '1433:1433'
    volumes:
      - sqlserver_data:/var/opt/mssql

volumes:
  sqlserver_data:
```

### Dockerfile untuk Node.js

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 8080
CMD ["npm", "start"]
```

### Dockerfile untuk Python face-service

```dockerfile
FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 12. Langkah Implementasi Bertahap untuk Tim Pemula

### Tahap 1

Tambahkan database table:
- `face_profiles`
- opsional `face_verification_logs`

### Tahap 2

Tambahkan repository dan service baru di Node.js:
- `FaceProfileRepository.ts`
- `FaceRecognitionService.ts`

### Tahap 3

Ubah endpoint Flutter:
- `check-in` menerima foto wajah
- tambah endpoint `face/register`
- tambah endpoint `face-status`

### Tahap 4

Buat Python face-service sebagai container terpisah.

### Tahap 5

Hubungkan Node.js ke face-service via HTTP internal Docker network.

### Tahap 6

Simpan hasil confidence score ke tabel `attendance` atau log verifikasi.

### Tahap 7

Tambahkan response code yang tegas untuk Flutter:
- `ATTENDANCE_SUCCESS`
- `FACE_NOT_REGISTERED`
- `FACE_NOT_MATCH`
- `USER_NOT_FOUND`
- `INSUFFICIENT_IDENTITY_DATA`

---

## 13. Kesimpulan Praktis

Kalau pertanyaannya adalah "integrasi saya masuk di mana?", jawabannya:

- masuk utamanya di service layer backend Node.js,
- tepatnya di flow Flutter attendance yang sudah ada,
- dengan menambah service wajah dan repository profil wajah,
- lalu backend Node.js memanggil Python face engine terpisah,
- dan semua service dijalankan bersama lewat Docker Compose.

Untuk pemula, ini adalah jalur paling stabil dan paling mudah dirawat.

Node.js tetap jadi backend utama.
Python tetap jadi mesin face recognition.
SQL Server tetap jadi sumber data utama.
Docker dipakai untuk menyatukan semuanya.

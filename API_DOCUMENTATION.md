# VISIATTEND API Documentation

Dokumentasi singkat untuk REST API aktif pada backend VISIATTEND.

## Base URL

```text
Web/Local        : http://localhost:8080
Android Emulator : http://10.0.2.2:8080
```

Semua endpoint aplikasi diawali dengan `/api`, kecuali health check `GET /health`.

## Standard Response

Success:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Deskripsi error"
}
```

## Authentication

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `GET /api/auth/profile`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/verify-reset-code`
- `POST /api/auth/reset-password`

Request login:

```json
{
  "email": "user@email.com",
  "password": "password123"
}
```

Response login mengembalikan objek `user` dan `tokens` (`accessToken`, `refreshToken`).

## Flutter Attendance

Endpoint Flutter tidak memerlukan JWT.

### Face Attendance Flow

Flow baru untuk absensi wajah dibagi menjadi 3 endpoint:

1. isi form registrasi dulu
2. training wajah 3 kali
3. finalisasi registrasi member + simpan face profile
4. absen wajah sekali capture

Catatan:

- backend Node.js akan memanggil bridge Python dari folder `E:\CAPSTONE\BE\VISIATTEND\face-ai`
- flow ini tidak memerlukan Docker
- request gambar memakai field `imageBase64`

### `POST /api/flutter/attendance/face/register/start`

Dipakai saat user memilih menu registrasi wajah dan mengisi form biodata di awal.

Request minimal:

```json
{
  "fullName": "Budi Santoso",
  "email": "budi@email.com",
  "phoneNumber": "08123456789",
  "dateOfBirth": "2000-01-15",
  "category": "student"
}
```

Field opsional:

- `userId`
- `memberId`

Perilaku endpoint:

- backend memvalidasi email dan user ID belum dipakai
- backend menyimpan draft registrasi sementara
- backend mengembalikan `sessionId` yang wajib dipakai untuk training 3 capture
- response mengembalikan `nextStep: "face-training"`

### `POST /api/flutter/attendance/face/register-capture`

Dipakai setelah form registrasi disimpan dan user melakukan training capture.

Request minimal:

```json
{
  "imageBase64": "data:image/jpeg;base64,...",
  "sessionId": "session-id-dari-face-register-start"
}
```

Perilaku endpoint:

- `sessionId` harus berasal dari endpoint `face/register/start`
- setiap capture akan disimpan sebagai sample sementara
- target sample adalah 3 capture
- backend mengembalikan `readyForProfile: true` jika sample sudah cukup
- jika sample sudah 3, response mengembalikan `nextStep: "face-register-finalize"`

Response inti:

```json
{
  "success": true,
  "message": "Face training sample processed successfully",
  "data": {
    "nextStep": "face-training",
    "sessionId": "abc123",
    "sampleCount": 1,
    "remainingCaptures": 2,
    "readyForProfile": false,
    "duplicateCapture": false,
    "embeddingDimension": 512,
    "faceDetection": {
      "confidence": 0.98,
      "box": { "x": 100, "y": 120, "w": 220, "h": 220 }
    }
  }
}
```

Jika sample sudah lengkap:

```json
{
  "success": true,
  "message": "Face training sample processed successfully",
  "data": {
    "nextStep": "face-register-finalize",
    "sessionId": "abc123",
    "sampleCount": 3,
    "remainingCaptures": 0,
    "readyForProfile": true
  }
}
```

### `POST /api/flutter/attendance/face/register`

Dipakai setelah 3 training capture selesai untuk finalisasi registrasi.

Request minimal:

```json
{
  "sessionId": "abc123"
}
```

Jika draft registrasi dari `face/register/start` hilang, backend juga masih bisa menerima fallback field berikut bersama `sessionId`:

- `fullName`
- `email`
- `phoneNumber`
- `dateOfBirth`
- `category`
- `userId`
- `memberId`

Perilaku endpoint:

- backend membaca draft registrasi dari session yang sudah dibuat saat form awal
- backend membuat member di database
- backend memindahkan 3 sample training sementara menjadi face profile permanen user
- response mengembalikan `nextStep: "user-dashboard"`

### `POST /api/flutter/attendance/face/check-in`

Dipakai saat user memilih absen wajah langsung tanpa login admin.

Request minimal:

```json
{
  "imageBase64": "data:image/jpeg;base64,..."
}
```

Field opsional:

- `attendanceDate`
- `checkInTime`
- `deviceInfo`
- `notes`
- `threshold`

Perilaku endpoint:

- backend mengirim gambar ke Python face bridge
- Python mencari wajah terbesar lalu mencocokkan ke data wajah yang sudah tersimpan
- jika match, backend mencatat attendance dan mengembalikan dashboard user
- jika tidak match, backend mengembalikan `requiresRegistration: true`

Jika wajah tidak dikenali:

```json
{
  "success": true,
  "message": "Face not recognized. Registration is required before attendance can be recorded.",
  "data": {
    "requiresRegistration": true,
    "nextStep": "registration",
    "faceVerification": {
      "matched": false,
      "code": "FACE_NOT_MATCH"
    }
  }
}
```

### `POST /api/flutter/attendance/check-in`

Minimal field:

```json
{
  "attendanceDate": "2026-05-13",
  "checkInTime": "2026-05-13T08:00:00.000Z",
  "userId": "VST-001"
}
```

Salah satu identifier wajib dikirim:

- `userId`
- `memberId`
- `email`

Field opsional:

- `deviceInfo`
- `notes`

Jika user ditemukan, response berisi:

- `requiresRegistration: false`
- `nextStep: "user-dashboard"`
- `user`
- `attendance`
- `summary`
- `pointLog`
- `dashboard`
- `isNew`

Jika user tidak ditemukan, response berisi:

```json
{
  "success": true,
  "message": "User not found. Registration is required before attendance can be recorded.",
  "data": {
    "requiresRegistration": true,
    "nextStep": "registration"
  }
}
```

### `POST /api/flutter/attendance/register`

Minimal field registrasi:

```json
{
  "fullName": "Budi Santoso",
  "email": "user@email.com",
  "phoneNumber": "08123456789",
  "dateOfBirth": "2000-01-15",
  "category": "student"
}
```

Field opsional:

- `userId` atau `memberId`
- `attendanceDate`
- `checkInTime`
- `deviceInfo`
- `notes`

Perilaku endpoint:

- Jika hanya data registrasi yang dikirim, backend membuat member dan mengembalikan `nextStep: "check-in"`.
- Jika `attendanceDate` dan `checkInTime` ikut dikirim, backend akan register member lalu langsung mencatat absensi dan mengembalikan `nextStep: "user-dashboard"` beserta `dashboard`.

## Users

- `GET /api/users`
- `GET /api/users/:id`
- `GET /api/users/:id/dashboard`
- `POST /api/users`
- `PUT /api/users/:id`
- `PATCH /api/users/:id/toggle-status`
- `DELETE /api/users/:id`

Query yang didukung untuk list user:

- `role`
- `isActive`

## Attendance

- `GET /api/attendance`
- `GET /api/attendance/:id`
- `GET /api/attendance/stats/today`
- `GET /api/attendance/trend`
- `GET /api/attendance/leaderboard`
- `POST /api/attendance`
- `PUT /api/attendance/:id`
- `DELETE /api/attendance/:id`

Query yang didukung untuk list attendance:

- `userId`
- `startDate`
- `endDate`
- `status`

## Dashboard

- `GET /api/dashboard/stats`
- `GET /api/dashboard/activities`

Query opsional untuk activities:

- `limit`

## Points

- `GET /api/points/logs`
- `GET /api/points/leaderboard`
- `POST /api/points/quiz`

Query yang didukung:

- `GET /api/points/logs?userId=<int>`
- `GET /api/points/leaderboard?limit=<int>`

Request body untuk quiz points:

```json
{
  "userId": 2,
  "points": 5
}
```

## Utility Endpoints

- `GET /api/ping`
- `GET /api/demo`
- `GET /health`

## Flutter Flow Ringkas

```text
1. Flutter kirim POST /api/flutter/attendance/check-in dengan userId/memberId/email.
2. Jika user ditemukan, backend mencatat absensi dan mengembalikan dashboard.
3. Jika user tidak ditemukan, backend mengembalikan requiresRegistration: true.
4. Flutter tampilkan form registrasi.
5. Flutter kirim POST /api/flutter/attendance/register.
6. Backend membuat member, lalu opsional langsung mencatat absensi jika waktu absensi ikut dikirim.
```

## Catatan Teknis

- Database: Microsoft SQL Server (`VISIATTEND_DB`)
- Authentication: JWT access token dan refresh token
- Duplikasi absensi: 1 user hanya 1 absensi per hari
- Poin default: absensi valid pertama per hari memberi `+10` poin
- `user_id` pada response attendance dan point logs adalah FK integer ke `users.id`
- `member_id` adalah ID member yang terbaca manusia seperti `VST-001`

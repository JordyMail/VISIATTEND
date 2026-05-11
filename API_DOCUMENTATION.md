# VISIATTEND API Documentation

Dokumentasi REST API yang telah diverifikasi melalui live testing (April 2026).
Untuk integrasi frontend web (React) dan mobile (Flutter).

---

## Daftar Isi

1. [Setup & Base URL](#1-setup--base-url)
2. [Standard Response Format](#2-standard-response-format)
3. [Authentication](#3-authentication)
4. [Flutter Attendance](#4-flutter-attendance)
5. [Users](#5-users)
6. [Attendance (Admin/Web)](#6-attendance-adminweb)
7. [Dashboard](#7-dashboard)
8. [Points](#8-points)
9. [Data Models](#9-data-models)
10. [Alur Sistem Flutter](#10-alur-sistem-flutter)
11. [Contoh Retrofit Interface (Flutter/Dart)](#11-contoh-retrofit-interface-flutterdart)
12. [Error Handling](#12-error-handling)
13. [Face Service (Python)](#13-face-service-python)

---

## 1. Setup & Base URL

```
Base URL (Dev Local)  : http://localhost:8080
Base URL (Android Emu): http://10.0.2.2:8080
Face Service (Local)  : http://localhost:8000
```

> Semua endpoint Node.js diawali `/api/`. CORS sudah dikonfigurasi.

---

## 2. Standard Response Format

Semua endpoint selalu mengembalikan format JSON yang konsisten:

```json
// Success (HTTP 200 atau 201)
{
  "success": true,
  "message": "Pesan opsional",
  "data": { }
}

// Error
{
  "success": false,
  "message": "Deskripsi error"
}
```

| HTTP Status | Arti |
|-------------|------|
| `200` | OK |
| `201` | Created |
| `400` | Bad Request — field wajib kurang / validasi gagal |
| `401` | Unauthorized — token tidak valid / salah credentials |
| `404` | Not Found |
| `500` | Server Error |

---

## 3. Authentication

### `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@email.com",
  "password": "password123"
}
```

**Response `data`:**
```json
{
  "user": {
    "id": 1,
    "full_name": "Admin User",
    "user_id": "ADMIN001",
    "email": "admin@gmail.com",
    "role": "admin",
    "phone_number": "081234567890",
    "date_of_birth": null,
    "category": null,
    "total_points": 0,
    "is_active": true,
    "email_verified": true,
    "last_login": "2026-04-20T21:10:01.127Z",
    "created_at": "2026-04-20T10:12:45.340Z",
    "updated_at": "2026-04-20T21:10:01.127Z",
    "total_hadir": null,
    "total_check_in": null,
    "total_check_out": null
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

> **Token TTL:** `accessToken` = 12 jam, `refreshToken` = 7 hari.

---

### `POST /api/auth/register`

**Request Body:**
```json
{
  "fullName": "Budi Santoso",
  "email": "user@email.com",
  "password": "password123",
  "confirmPassword": "password123",
  "phoneNumber": "08123456789",
  "userId": "VST-001",
  "dateOfBirth": "2000-01-15",
  "category": "student"
}
```

| Field | Wajib | Keterangan |
|-------|-------|------------|
| `fullName` | ✅ | |
| `email` | ✅ | Harus unik |
| `password` | ✅ | |
| `confirmPassword` | ✅ | Harus sama dengan `password` |
| `phoneNumber` | ✅ | |
| `userId` | ❌ | Auto-generate jika kosong. Alias: `memberId` |
| `dateOfBirth` | ❌ | Format `YYYY-MM-DD` |
| `category` | ❌ | `"student"` \| `"other"` |

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "userId": 3,
    "user_id": "MEM158490"
  }
}
```

---

### `GET /api/auth/profile`

Mendapatkan profil user yang sedang login.

**Request Header:**
```
Authorization: Bearer <accessToken>
```

**Response `data`:**
```json
{
  "user": {
    "id": 1,
    "full_name": "Admin User",
    "user_id": "ADMIN001",
    "email": "admin@gmail.com",
    "role": "admin",
    "phone_number": "081234567890",
    "date_of_birth": null,
    "category": null,
    "total_points": 0,
    "is_active": true,
    "email_verified": true,
    "last_login": "2026-04-20T21:10:01.127Z",
    "created_at": "2026-04-20T10:12:45.340Z",
    "updated_at": "2026-04-20T21:10:01.127Z",
    "total_hadir": null,
    "total_check_in": null,
    "total_check_out": null
  }
}
```

---

### `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJ..."
  }
}
```

---

### `POST /api/auth/logout`

**Request Header:**
```
Authorization: Bearer <accessToken>
```

**Response:** `{ "success": true, "message": "Logout successful", "data": null }`

---

### `POST /api/auth/forgot-password`

**Request Body:** `{ "email": "user@email.com" }`

---

### `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "email": "user@email.com",
  "newPassword": "newpassword123"
}
```

---

## 4. Flutter Attendance

> Endpoint khusus Flutter. **Tidak memerlukan JWT token.**

---

### `POST /api/flutter/attendance/check-in`

Endpoint utama yang dipanggil setelah face scan.

**Request Body:**
```json
{
  "attendanceDate": "2026-04-20",
  "checkInTime": "2026-04-20T08:00:00.000Z",
  "userId": "VST-001",
  "deviceInfo": "Samsung Galaxy S21",
  "notes": "catatan opsional"
}
```

| Field | Wajib | Keterangan |
|-------|-------|------------|
| `attendanceDate` | ✅ | Format `YYYY-MM-DD` |
| `checkInTime` | ✅ | Format ISO 8601 |
| `userId` / `memberId` | ❌ | Hasil face recognition |
| `email` | ❌ | Fallback pencarian user |
| `fullName` | ❌ | Dibutuhkan jika user baru (auto-register) |
| `phoneNumber` | ❌ | Dibutuhkan jika user baru |
| `dateOfBirth` | ❌ | Format `YYYY-MM-DD` |
| `category` | ❌ | `"student"` \| `"other"` |
| `deviceInfo` | ❌ | Info perangkat |
| `notes` | ❌ | Catatan bebas |

#### Skenario A — User ditemukan, absensi berhasil

```json
{
  "success": true,
  "message": "Attendance processed successfully",
  "data": {
    "requiresRegistration": false,
    "registered": false,
    "nextStep": "user-dashboard",
    "isNew": true,
    "user": {
      "id": 2,
      "full_name": "Audit Flow User",
      "user_id": "AUD20260420210020",
      "email": "audit@example.com",
      "role": "member",
      "phone_number": "081234567890",
      "date_of_birth": "2000-01-01T00:00:00.000Z",
      "category": "student",
      "total_points": 15,
      "is_active": true,
      "email_verified": false,
      "last_login": null,
      "created_at": "2026-04-20T21:00:21.537Z",
      "updated_at": "2026-04-20T21:01:36.863Z"
    },
    "attendance": {
      "id": 2,
      "user_id": 2,
      "event_id": null,
      "attendance_date": "2026-04-21T00:00:00.000Z",
      "check_in_time": "2026-04-21T08:00:00.000Z",
      "check_out_time": null,
      "status": "present",
      "confidence_score": null,
      "liveness_verified": false,
      "device_info": "Samsung Galaxy S21",
      "notes": null,
      "created_at": "2026-04-20T21:09:02.077Z",
      "updated_at": "2026-04-20T21:09:02.077Z",
      "face_image_url": null,
      "user_name": "Audit Flow User",
      "member_id": "AUD20260420210020"
    },
    "summary": {
      "user_id": 2,
      "total_hadir": 2,
      "total_check_in": 2,
      "total_check_out": 0
    },
    "pointLog": {
      "id": 3,
      "user_id": 2,
      "points": 10,
      "type": "attendance",
      "created_at": "2026-04-20T21:09:02.130Z"
    },
    "dashboard": {
      "user": { "...user object + total_hadir/check_in/check_out" },
      "summary": { "...sama seperti summary" },
      "stats": {
        "totalCorrectAnswers": 1,
        "attendancePercentage": 100,
        "totalPoints": 25
      },
      "recentAttendance": ["...array attendance objects"],
      "pointLogs": ["...array point log objects"]
    }
  }
}
```

**Catatan penting tentang field:**
- `user_id` (integer) = FK ke `users.id` (primary key database)
- `member_id` (string) = Member ID yang readable (contoh: `"VST-001"`, `"AUD20260420210020"`)
- `user_name` (string) = Nama lengkap user

#### Skenario B — User belum ada + data cukup → auto-register + absensi

```json
{
  "success": true,
  "data": {
    "requiresRegistration": false,
    "registered": true,
    "nextStep": "user-dashboard",
    "user": { "...newUser" },
    "attendance": { "...attendanceData" },
    "summary": { "...summaryData" },
    "pointLog": { "...pointLogData" },
    "dashboard": { "...dashboardData" }
  }
}
```

#### Skenario C — User tidak dikenali + data tidak cukup → perlu registrasi

```json
{
  "success": true,
  "message": "User not detected. Registration is required before attendance can be recorded.",
  "data": {
    "requiresRegistration": true,
    "nextStep": "registration",
    "message": "User not detected. Registration is required before attendance can be recorded."
  }
}
```

#### Skenario D — User sudah absen hari ini (duplikat)

Server mengembalikan data absensi yang sudah ada, tanpa error. `isNew` = `false`, `pointLog` = `null` (poin tidak diberikan lagi).

> **Logic Flutter:** Cek `data.requiresRegistration`:
> - `false` → navigasi ke dashboard
> - `true` → tampilkan form registrasi → panggil `/register`

---

### `POST /api/flutter/attendance/register`

Dipakai setelah Skenario C — user mengisi form registrasi.

**Request Body:**
```json
{
  "fullName": "Budi Santoso",
  "email": "user@email.com",
  "phoneNumber": "08123456789",
  "dateOfBirth": "2000-01-15",
  "category": "student",
  "attendanceDate": "2026-04-20",
  "checkInTime": "2026-04-20T08:00:00.000Z",
  "userId": "VST-001",
  "deviceInfo": "Samsung Galaxy S21"
}
```

| Field | Wajib |
|-------|-------|
| `fullName` | ✅ |
| `email` | ✅ |
| `phoneNumber` | ✅ |
| `dateOfBirth` | ✅ |
| `category` | ✅ |
| `attendanceDate` | ✅ |
| `checkInTime` | ✅ |
| `userId` | ❌ |
| `deviceInfo` | ❌ |

**Response `data`:**
```json
{
  "nextStep": "user-dashboard",
  "user": { "...userData" },
  "attendance": { "...attendanceData" },
  "summary": { "...summaryData" },
  "pointLog": { "...pointLogData" },
  "dashboard": { "...dashboardData" }
}
```

---

## 5. Users

### `GET /api/users`

Daftar semua user. Filter via query string.

| Query Param | Contoh | Keterangan |
|-------------|--------|------------|
| `role` | `?role=member` | `"admin"` \| `"preacher"` \| `"member"` \| `"staff"` |
| `isActive` | `?isActive=true` | `true` \| `false` |

**Response `data`:** Array of User objects (tanpa `password_hash`).

```json
[
  {
    "id": 3,
    "full_name": "Test User",
    "user_id": "MEM158490",
    "email": "test@example.com",
    "role": "member",
    "phone_number": "081999888777",
    "date_of_birth": null,
    "category": null,
    "total_points": 0,
    "is_active": true,
    "email_verified": false,
    "last_login": "2026-04-20T21:09:18.777Z",
    "created_at": "2026-04-20T21:09:18.577Z",
    "updated_at": "2026-04-20T21:09:18.777Z"
  }
]
```

---

### `GET /api/users/:id`

Detail satu user.

---

### `GET /api/users/:id/dashboard`

Dashboard lengkap user. Dipakai Flutter untuk halaman profil setelah absensi.

**Response `data`:**
```json
{
  "user": {
    "id": 2,
    "full_name": "Audit Flow User",
    "user_id": "AUD20260420210020",
    "email": "audit@example.com",
    "role": "member",
    "phone_number": "081234567890",
    "date_of_birth": "2000-01-01T00:00:00.000Z",
    "category": "student",
    "total_points": 25,
    "is_active": true,
    "email_verified": false,
    "last_login": null,
    "created_at": "2026-04-20T21:00:21.537Z",
    "updated_at": "2026-04-20T21:09:02.150Z",
    "total_hadir": 2,
    "total_check_in": 2,
    "total_check_out": 0
  },
  "summary": {
    "user_id": 2,
    "total_hadir": 2,
    "total_check_in": 2,
    "total_check_out": 0
  },
  "stats": {
    "totalCorrectAnswers": 1,
    "attendancePercentage": 100,
    "totalPoints": 25
  },
  "recentAttendance": [
    {
      "id": 2,
      "user_id": 2,
      "event_id": null,
      "attendance_date": "2026-04-21T00:00:00.000Z",
      "check_in_time": "2026-04-21T08:00:00.000Z",
      "check_out_time": null,
      "status": "present",
      "confidence_score": null,
      "liveness_verified": false,
      "device_info": "Audit",
      "notes": null,
      "face_image_url": null,
      "user_name": "Audit Flow User",
      "member_id": "AUD20260420210020"
    }
  ],
  "pointLogs": [
    {
      "id": 3,
      "user_id": 2,
      "points": 10,
      "type": "attendance",
      "created_at": "2026-04-20T21:09:02.130Z",
      "user_name": "Audit Flow User",
      "member_id": "AUD20260420210020"
    }
  ]
}
```

---

### `POST /api/users`

Buat user baru (admin web).

**Request Body:**
```json
{
  "fullName": "Budi Santoso",
  "userId": "VST-001",
  "email": "user@email.com",
  "password": "password123",
  "role": "member",
  "phoneNumber": "08123456789",
  "dateOfBirth": "2000-01-15",
  "category": "student"
}
```

**Field wajib:** `fullName`, `userId` (atau `memberId`), `email`, `password`

---

### `PUT /api/users/:id`

Update data user. Body berisi field yang ingin diubah.

Updatable fields: `fullName`, `email`, `phoneNumber`, `dateOfBirth`, `category`, `role`, `isActive`

---

### `PATCH /api/users/:id/toggle-status`

Toggle `is_active` user.

---

### `DELETE /api/users/:id`

Hapus user permanen.

---

## 6. Attendance (Admin/Web)

> Endpoint admin. Flutter sebaiknya pakai `/api/flutter/attendance/*`.

### `GET /api/attendance`

Daftar semua absensi.

| Query Param | Contoh |
|-------------|--------|
| `userId` | `?userId=2` (integer PK) |
| `startDate` | `?startDate=2026-04-01` |
| `endDate` | `?endDate=2026-04-30` |
| `status` | `?status=present` |

**Response `data`:** Array of Attendance objects.

```json
[
  {
    "id": 2,
    "user_id": 2,
    "event_id": null,
    "attendance_date": "2026-04-21T00:00:00.000Z",
    "check_in_time": "2026-04-21T08:00:00.000Z",
    "check_out_time": null,
    "status": "present",
    "confidence_score": null,
    "liveness_verified": false,
    "device_info": "Audit",
    "notes": null,
    "created_at": "2026-04-20T21:09:02.077Z",
    "updated_at": "2026-04-20T21:09:02.077Z",
    "face_image_url": null,
    "user_name": "Audit Flow User",
    "member_id": "AUD20260420210020"
  }
]
```

---

### `GET /api/attendance/:id`

Detail satu record absensi.

---

### `GET /api/attendance/stats/today`

Statistik absensi hari ini.

**Response `data`:**
```json
{
  "checkedIn": 1,
  "pending": 1,
  "absent": 0
}
```

---

### `GET /api/attendance/trend`

Tren absensi harian.

| Query Param | Default | Keterangan |
|-------------|---------|------------|
| `days` | `7` | Jumlah hari ke belakang |
| `userId` | — | Filter per user (opsional) |

**Response `data`:**
```json
[
  {
    "attendance_date": "2026-04-20T00:00:00.000Z",
    "total_present": 1,
    "total_absent": 0
  }
]
```

---

### `GET /api/attendance/leaderboard`

Leaderboard kehadiran.

| Query Param | Default |
|-------------|---------|
| `period` | `"semester"` — opsi: `"week"`, `"month"`, `"semester"` |

---

### `POST /api/attendance`

Buat record absensi manual (admin).

**Request Body:**
```json
{
  "userId": 2,
  "attendanceDate": "2026-04-20",
  "checkInTime": "2026-04-20T08:00:00.000Z",
  "status": "present",
  "notes": "catatan"
}
```

**Field wajib:** `userId` (integer), `attendanceDate`, `checkInTime`, `status`

**Status values:** `"present"` | `"late"` | `"excused"` | `"sick"` | `"absent"`

---

### `PUT /api/attendance/:id`

Update absensi. Updatable: `checkOutTime`, `status`, `notes`

---

### `DELETE /api/attendance/:id`

Hapus record absensi.

---

## 7. Dashboard

### `GET /api/dashboard/stats`

Statistik keseluruhan untuk halaman admin.

**Response `data`:**
```json
{
  "totalMembers": 2,
  "todayAttendance": {
    "checkedIn": 1,
    "pending": 1,
    "absent": 0
  },
  "attendanceRate": 100,
  "totalPointsAwarded": 25,
  "topScorer": {
    "member_pk_id": 2,
    "full_name": "Audit Flow User",
    "user_id": "AUD20260420210020",
    "total_points": 25,
    "total_correct_answers": 1,
    "attendance_percentage": 100,
    "total_hadir": 2
  }
}
```

> **Catatan:** `topScorer` bisa `null` jika belum ada user dengan poin.

---

### `GET /api/dashboard/activities`

Log aktivitas terbaru di sistem.

| Query Param | Default |
|-------------|---------|
| `limit` | `10` |

**Response `data`:**
```json
[
  {
    "id": 8,
    "user_id": 1,
    "action": "AUTH_LOGIN",
    "entity_type": "users",
    "entity_id": 1,
    "description": "User admin@gmail.com logged in",
    "ip_address": "::1",
    "created_at": "2026-04-20T21:10:01.133Z",
    "user_name": "Admin User"
  }
]
```

**Action types:**
`AUTH_LOGIN`, `AUTH_REGISTER`, `ATTENDANCE_CREATED`, `ATTENDANCE_UPDATED`, `ATTENDANCE_DELETED`, `USER_CREATED`, `USER_REGISTERED_FROM_ATTENDANCE`, `QUIZ_POINTS_AWARDED`

---

## 8. Points

### `GET /api/points/logs?userId=<int>`

Riwayat poin satu user. `userId` (integer PK) **wajib**.

**Response `data`:**
```json
[
  {
    "id": 3,
    "user_id": 2,
    "points": 10,
    "type": "attendance",
    "created_at": "2026-04-20T21:09:02.130Z",
    "user_name": "Audit Flow User",
    "member_id": "AUD20260420210020"
  }
]
```

---

### `GET /api/points/leaderboard`

| Query Param | Default |
|-------------|---------|
| `limit` | `50` |

**Response `data`:**
```json
[
  {
    "member_pk_id": 2,
    "full_name": "Audit Flow User",
    "user_id": "AUD20260420210020",
    "total_points": 25,
    "total_correct_answers": 1,
    "attendance_percentage": 100,
    "total_hadir": 2
  }
]
```

---

### `POST /api/points/quiz`

Tambahkan poin quiz.

**Request Body:**
```json
{
  "userId": 2,
  "points": 5
}
```

**Field wajib:** `userId` (integer PK), `points` (integer)

---

## 9. Data Models

### User

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | integer | PK, auto-increment |
| `user_id` | string | Member ID unik, contoh `"VST-001"` |
| `full_name` | string | |
| `email` | string | Unique |
| `role` | string | `"admin"` \| `"preacher"` \| `"member"` \| `"staff"` |
| `phone_number` | string \| null | |
| `date_of_birth` | string \| null | ISO date |
| `category` | string \| null | `"student"` \| `"other"` |
| `total_points` | integer | Akumulasi semua poin |
| `is_active` | boolean | |
| `email_verified` | boolean | |
| `last_login` | datetime \| null | |
| `created_at` | datetime | |
| `updated_at` | datetime | |
| `total_hadir` | integer \| null | Dari JOIN attendance_summary (beberapa endpoint) |
| `total_check_in` | integer \| null | Dari JOIN attendance_summary |
| `total_check_out` | integer \| null | Dari JOIN attendance_summary |

> `password_hash` **tidak pernah** dikembalikan di response manapun.

---

### Attendance

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | integer | PK |
| `user_id` | integer | FK → users.id |
| `event_id` | integer \| null | FK → events.id |
| `attendance_date` | datetime | |
| `check_in_time` | datetime | |
| `check_out_time` | datetime \| null | |
| `status` | string | `"present"` \| `"late"` \| `"excused"` \| `"sick"` \| `"absent"` |
| `confidence_score` | float \| null | Hasil face recognition (0–100) |
| `liveness_verified` | boolean | |
| `device_info` | string \| null | |
| `face_image_url` | string \| null | |
| `notes` | string \| null | |
| `created_at` | datetime | |
| `updated_at` | datetime | |
| `user_name` | string | Dari JOIN (response list/detail) |
| `member_id` | string | Member ID user (response list/detail) |

---

### AttendanceSummary

| Field | Type |
|-------|------|
| `user_id` | integer (PK) |
| `total_hadir` | integer |
| `total_check_in` | integer |
| `total_check_out` | integer |

---

### PointLog

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | integer | PK |
| `user_id` | integer | FK → users.id |
| `points` | integer | |
| `type` | string | `"attendance"` \| `"quiz"` |
| `created_at` | datetime | |
| `user_name` | string | Dari JOIN (response list) |
| `member_id` | string | Member ID user (response list) |

---

### ActivityLog

| Field | Type |
|-------|------|
| `id` | integer |
| `user_id` | integer |
| `action` | string |
| `entity_type` | string |
| `entity_id` | integer |
| `description` | string |
| `ip_address` | string \| null |
| `created_at` | datetime |
| `user_name` | string |

---

## 10. Alur Sistem Flutter

```
┌────────────────────────────────────────────────────────────┐
│                     FLUTTER APP FLOW                       │
└────────────────────────────────────────────────────────────┘

1. Kamera aktif → Face Scan
        │
        ▼
2. POST /api/flutter/attendance/check-in
   (kirim userId + tanggal & jam)
        │
        ├── requiresRegistration: false
        │   nextStep: "user-dashboard"
        │        │
        │        ▼
        │   Tampilkan Dashboard
        │   (pakai data.dashboard)
        │
        └── requiresRegistration: true
            nextStep: "registration"
                 │
                 ▼
            Form Registrasi
            (fullName, email, phone, DOB, category)
                 │
                 ▼
            POST /api/flutter/attendance/register
                 │
                 ▼
            Tampilkan Dashboard
            (pakai data.dashboard)
```

### Poin Otomatis

Setiap absensi `present` atau `late` yang pertama di hari itu → **+10 poin** otomatis.
Duplikasi dicegah (1 user = 1 absensi/hari). Poin tidak diberikan lagi pada duplikat.

---

## 11. Contoh Retrofit Interface (Flutter/Dart)

```dart
import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';

part 'api_client.g.dart';

const String BASE_URL = 'http://10.0.2.2:8080';

@RestApi(baseUrl: BASE_URL)
abstract class VisiAttendApi {
  factory VisiAttendApi(Dio dio, {String baseUrl}) = _VisiAttendApi;

  // ─── Flutter Attendance ─────────────────────────────────
  @POST('/api/flutter/attendance/check-in')
  Future<ApiResponse<CheckInResult>> checkIn(@Body() CheckInRequest body);

  @POST('/api/flutter/attendance/register')
  Future<ApiResponse<RegisterResult>> registerAndAttend(@Body() RegisterRequest body);

  // ─── Auth ───────────────────────────────────────────────
  @POST('/api/auth/login')
  Future<ApiResponse<LoginResult>> login(@Body() LoginRequest body);

  @POST('/api/auth/register')
  Future<ApiResponse<RegisterUserResult>> register(@Body() RegisterUserRequest body);

  @GET('/api/auth/profile')
  Future<ApiResponse<ProfileResult>> getProfile();

  @POST('/api/auth/refresh')
  Future<ApiResponse<RefreshResult>> refreshToken(@Body() RefreshRequest body);

  @POST('/api/auth/logout')
  Future<ApiResponse<void>> logout();

  // ─── Users ──────────────────────────────────────────────
  @GET('/api/users/{id}/dashboard')
  Future<ApiResponse<UserDashboard>> getUserDashboard(@Path('id') int userId);

  // ─── Points ─────────────────────────────────────────────
  @GET('/api/points/leaderboard')
  Future<ApiResponse<List<LeaderboardItem>>> getLeaderboard({@Query('limit') int limit = 50});

  @GET('/api/points/logs')
  Future<ApiResponse<List<PointLog>>> getPointLogs(@Query('userId') int userId);
}
```

### Standard Wrapper

```dart
@JsonSerializable(genericArgumentFactories: true)
class ApiResponse<T> {
  final bool success;
  final String? message;
  final T? data;

  ApiResponse({required this.success, this.message, this.data});

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object?) fromJsonT,
  ) => _$ApiResponseFromJson(json, fromJsonT);
}
```

### CheckIn Models

```dart
@JsonSerializable()
class CheckInRequest {
  final String attendanceDate;
  final String checkInTime;
  final String? userId;
  final String? memberId;
  final String? email;
  final String? fullName;
  final String? phoneNumber;
  final String? dateOfBirth;
  final String? category;
  final String? deviceInfo;
  final String? notes;

  CheckInRequest({
    required this.attendanceDate,
    required this.checkInTime,
    this.userId,
    this.memberId,
    this.email,
    this.fullName,
    this.phoneNumber,
    this.dateOfBirth,
    this.category,
    this.deviceInfo,
    this.notes,
  });

  factory CheckInRequest.fromJson(Map<String, dynamic> json) =>
      _$CheckInRequestFromJson(json);
  Map<String, dynamic> toJson() => _$CheckInRequestToJson(this);
}

@JsonSerializable()
class CheckInResult {
  final bool requiresRegistration;
  final String nextStep;        // "user-dashboard" | "registration"
  final bool? registered;
  final bool? isNew;
  final String? message;
  final UserModel? user;
  final AttendanceModel? attendance;
  final AttendanceSummary? summary;
  final PointLogModel? pointLog;
  final UserDashboard? dashboard;

  CheckInResult({
    required this.requiresRegistration,
    required this.nextStep,
    this.registered,
    this.isNew,
    this.message,
    this.user,
    this.attendance,
    this.summary,
    this.pointLog,
    this.dashboard,
  });
}
```

---

## 12. Error Handling

### Contoh Error Responses

```json
// 400 Bad Request
{
  "success": false,
  "message": "attendanceDate and checkInTime are required"
}

// 401 Unauthorized
{
  "success": false,
  "message": "Email atau password salah"
}

// 404 Not Found
{
  "success": false,
  "message": "User not found"
}

// 500 Server Error
{
  "success": false,
  "message": "Failed to process flutter attendance"
}
```

### Flutter Error Handling

```dart
try {
  final response = await api.checkIn(request);
  if (response.success && response.data != null) {
    final result = response.data!;
    if (result.requiresRegistration) {
      // → Form registrasi
    } else {
      // → Dashboard
    }
  }
} on DioException catch (e) {
  final message = e.response?.data['message'] ?? 'Terjadi kesalahan';
  // Tampilkan pesan error
}
```

---

## 13. Face Service (Python)

> Service terpisah untuk face recognition. Berjalan di port 8000.
> **FE web tidak perlu memanggil langsung** — ini referensi untuk debugging dan Flutter dev.

Base URL: `http://localhost:8000`

### `GET /health`

```json
{
  "status": "healthy",
  "service": "VISIATTEND Face Recognition Service",
  "timestamp": "2026-04-20T08:00:00.000Z",
  "model_loaded": true
}
```

### `POST /api/face/register`

Register wajah user.

| Param | Type | Keterangan |
|-------|------|------------|
| `user_id` | query string | Wajib |
| `file` | multipart file | Foto wajah (JPG/PNG) |
| `device_info` | query string | Opsional |

### `POST /api/face/verify`

Verify wajah untuk attendance.

| Param | Type | Keterangan |
|-------|------|------------|
| `file` | multipart file | Foto wajah (JPG/PNG) |
| `user_id` | query string | Opsional |

**Response codes:** `FACE_MATCH`, `FACE_NOT_MATCH`, `FACE_NOT_REGISTERED`, `FACE_NOT_DETECTED`

### `GET /api/face/check-registration/{user_id}`

Cek apakah user sudah register wajah.

### `DELETE /api/face/{user_id}`

Hapus profil wajah user.

> Swagger docs: `http://localhost:8000/docs`

---

## Catatan Teknis

| Hal | Detail |
|-----|--------|
| Database | Microsoft SQL Server (`VISIATTEND_DB`) |
| Auth Token | JWT — simpan `accessToken` di secure storage |
| Duplikasi Absensi | 1 user = 1 absensi/hari — server return data lama jika duplikat |
| Auto-generate ID | Jika `userId` kosong saat register, server auto-generate |
| Poin Default | Absensi valid (bukan `absent`) = **+10 poin** otomatis |
| `password_hash` | **Tidak pernah** dikembalikan di response manapun |
| `user_id` di attendance/pointLog | Integer FK ke `users.id` — bukan Member ID |
| `member_id` di attendance/pointLog | String Member ID user (contoh `"VST-001"`) dari JOIN |
| Health check | `GET /health` → `{ "status": "ok" }` |
# VISIATTEND API Documentation

Dokumentasi lengkap REST API untuk integrasi frontend (web & Flutter).

---

## Daftar Isi

1. [Setup & Base URL](#1-setup--base-url)
2. [Standard Response Format](#2-standard-response-format)
3. [Authentication](#3-authentication)
4. [Flutter Attendance (Endpoint Khusus Flutter)](#4-flutter-attendance-endpoint-khusus-flutter)
5. [Users](#5-users)
6. [Attendance (Admin/Web)](#6-attendance-adminweb)
7. [Dashboard](#7-dashboard)
8. [Points](#8-points)
9. [Data Models](#9-data-models)
10. [Alur Sistem Flutter (Face Attendance)](#10-alur-sistem-flutter-face-attendance)
11. [Contoh Retrofit Interface (Flutter/Dart)](#11-contoh-retrofit-interface-flutterdart)
12. [Error Handling](#12-error-handling)

---

## 1. Setup & Base URL

```
Base URL (Production) : https://<domain>/
Base URL (Dev Local)  : http://localhost:8080
Base URL (Android Emu): http://10.0.2.2:8080
```

> **Catatan:** Semua endpoint diawali `/api/`. Pastikan CORS sudah dikonfigurasi di server.

---

## 2. Standard Response Format

**Semua endpoint** selalu mengembalikan format JSON yang sama:

```json
// Success (HTTP 200 atau 201)
{
  "success": true,
  "message": "Pesan opsional",
  "data": { }  // object atau array
}

// Error
{
  "success": false,
  "message": "Deskripsi error",
  "details": { }  // opsional, tambahan info
}
```

| HTTP Status | Arti |
|-------------|------|
| `200` | OK — request berhasil |
| `201` | Created — data baru berhasil dibuat |
| `400` | Bad Request — field wajib kurang / validasi gagal |
| `401` | Unauthorized — token tidak valid / salah credentials |
| `404` | Not Found — data tidak ditemukan |
| `500` | Server Error — error internal server |

---

## 3. Authentication

### `POST /api/auth/login`

Login dengan email dan password.

**Request Body:**
```json
{
  "email": "user@email.com",
  "password": "password123"
}
```

**Response `data`:**
```json
{
  "user": {
    "id": 1,
    "user_id": "VST-001",
    "full_name": "Budi Santoso",
    "email": "user@email.com",
    "role": "member",
    "phone_number": "08123456789",
    "date_of_birth": "2000-01-15",
    "category": "student",
    "total_points": 50,
    "is_active": true,
    "last_login": "2026-04-20T08:00:00.000Z",
    "created_at": "2026-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

> **Token TTL:** `accessToken` valid **12 jam**, `refreshToken` valid **7 hari**.

---

### `POST /api/auth/register`

Mendaftarkan user baru (dipakai dari web admin atau self-registration).

**Request Body:**
```json
{
  "fullName": "Budi Santoso",
  "email": "user@email.com",
  "password": "password123",
  "confirmPassword": "password123",
  "phoneNumber": "08123456789",
  "userId": "VST-001",           // opsional — auto-generate jika kosong
  "memberId": "VST-001",         // alias dari userId
  "dateOfBirth": "2000-01-15",   // opsional, format YYYY-MM-DD
  "category": "student"          // opsional: "student" | "other"
}
```

**Field wajib:** `fullName`, `email`, `password`, `confirmPassword`, `phoneNumber`

**Response `data`:**
```json
{
  "userId": 1,
  "user_id": "VST-001"
}
```

---

### `POST /api/auth/refresh`

Mendapatkan access token baru menggunakan refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response `data`:**
```json
{
  "accessToken": "eyJ..."
}
```

---

### `POST /api/auth/logout`

Invalidate session. Kirim access token di header.

**Request Header:**
```
Authorization: Bearer <accessToken>
```

**Response `data`:** `null`

---

### `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@email.com"
}
```

---

### `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "email": "user@email.com",
  "newPassword": "newpassword123"
}
```

---

## 4. Flutter Attendance (Endpoint Khusus Flutter)

> Endpoint ini **khusus untuk aplikasi Flutter** dengan flow face recognition.
> **Tidak memerlukan JWT token** — cocok untuk flow absensi publik.

---

### `POST /api/flutter/attendance/check-in`

**Endpoint utama** yang dipanggil setelah face scan selesai.
Mengirim data hasil identifikasi wajah ke server.

**Request Body:**
```json
{
  "attendanceDate": "2026-04-20",
  "checkInTime": "2026-04-20T08:00:00.000Z",
  "userId": "VST-001",
  "memberId": "VST-001",
  "email": "user@email.com",
  "fullName": "Budi Santoso",
  "phoneNumber": "08123456789",
  "dateOfBirth": "2000-01-15",
  "category": "student",
  "deviceInfo": "Samsung Galaxy S21",
  "notes": "catatan tambahan"
}
```

| Field | Wajib | Keterangan |
|-------|-------|------------|
| `attendanceDate` | ✅ | Format `YYYY-MM-DD` |
| `checkInTime` | ✅ | Format ISO 8601 datetime |
| `userId` / `memberId` | ❌ | Gunakan salah satu, hasil face scan |
| `email` | ❌ | Fallback pencarian user |
| `fullName` | ❌ | Dibutuhkan jika user baru |
| `phoneNumber` | ❌ | Dibutuhkan jika user baru |
| `dateOfBirth` | ❌ | Format `YYYY-MM-DD` |
| `category` | ❌ | `"student"` atau `"other"` |
| `deviceInfo` | ❌ | Info perangkat |
| `notes` | ❌ | Catatan bebas |

#### Skenario Response

**Skenario A — User ditemukan → absensi berhasil:**
```json
{
  "success": true,
  "data": {
    "requiresRegistration": false,
    "registered": false,
    "nextStep": "user-dashboard",
    "isNew": true,
    "user": { ...userData },
    "attendance": {
      "id": 10,
      "user_id": 1,
      "attendance_date": "2026-04-20",
      "check_in_time": "2026-04-20T08:00:00.000Z",
      "check_out_time": null,
      "status": "present",
      "device_info": "Samsung Galaxy S21",
      "liveness_verified": false
    },
    "summary": {
      "user_id": 1,
      "total_hadir": 10,
      "total_check_in": 10,
      "total_check_out": 5
    },
    "pointLog": {
      "id": 5,
      "user_id": 1,
      "points": 10,
      "type": "attendance",
      "created_at": "2026-04-20T08:00:00.000Z"
    },
    "dashboard": { ...dashboardData }
  }
}
```

**Skenario B — User belum terdaftar + data cukup → auto-register + absensi:**
```json
{
  "success": true,
  "data": {
    "requiresRegistration": false,
    "registered": true,
    "nextStep": "user-dashboard",
    "user": { ...newUserData },
    "attendance": { ...attendanceData },
    "summary": { ...summaryData },
    "pointLog": { ...pointLogData },
    "dashboard": { ...dashboardData }
  }
}
```

**Skenario C — User tidak dikenali + data tidak cukup → perlu registrasi:**
```json
{
  "success": true,
  "data": {
    "requiresRegistration": true,
    "nextStep": "registration",
    "message": "User not detected. Registration is required before attendance can be recorded."
  }
}
```

> **Logic Flutter:** Cek `data.requiresRegistration`.
> - `false` → navigasi ke halaman dashboard (`data.nextStep === "user-dashboard"`)
> - `true` → tampilkan form registrasi, lalu panggil endpoint `/register`

---

### `POST /api/flutter/attendance/register`

Dipakai setelah **Skenario C** — user mengisi form registrasi manual.

**Request Body:**
```json
{
  "fullName": "Budi Santoso",
  "email": "user@email.com",
  "phoneNumber": "08123456789",
  "dateOfBirth": "2000-01-15",
  "category": "student",
  "attendanceDate": "2026-04-20",
  "checkInTime": "2026-04-20T08:00:00.000Z",
  "userId": "VST-001",
  "deviceInfo": "Samsung Galaxy S21",
  "notes": "catatan"
}
```

| Field | Wajib |
|-------|-------|
| `fullName` | ✅ |
| `email` | ✅ |
| `phoneNumber` | ✅ |
| `dateOfBirth` | ✅ |
| `category` | ✅ |
| `attendanceDate` | ✅ |
| `checkInTime` | ✅ |
| `userId` | ❌ |
| `deviceInfo` | ❌ |
| `notes` | ❌ |

**Response `data`:**
```json
{
  "nextStep": "user-dashboard",
  "user": { ...userData },
  "attendance": { ...attendanceData },
  "summary": { ...summaryData },
  "pointLog": { ...pointLogData },
  "dashboard": { ...dashboardData }
}
```

---

## 5. Users

### `GET /api/users`

Daftar semua user. Mendukung filter via query string.

**Query Params (opsional):**
```
?role=member           // "admin" | "preacher" | "member" | "staff"
?isActive=true         // true | false
```

**Response `data`:** Array of user objects.

---

### `GET /api/users/:id`

Detail user berdasarkan ID.

---

### `GET /api/users/:id/dashboard`

Dashboard lengkap untuk satu user. Ini yang dipakai Flutter untuk menampilkan profil setelah absensi.

**Response `data`:**
```json
{
  "user": {
    "id": 1,
    "user_id": "VST-001",
    "full_name": "Budi Santoso",
    "email": "user@email.com",
    "role": "member",
    "total_points": 120
  },
  "summary": {
    "user_id": 1,
    "total_hadir": 12,
    "total_check_in": 12,
    "total_check_out": 5
  },
  "stats": {
    "totalCorrectAnswers": 8,
    "attendancePercentage": 85.5,
    "totalPoints": 120
  },
  "recentAttendance": [
    {
      "id": 10,
      "attendance_date": "2026-04-20",
      "check_in_time": "2026-04-20T08:00:00.000Z",
      "status": "present"
    }
  ],
  "pointLogs": [
    {
      "id": 5,
      "points": 10,
      "type": "attendance",
      "created_at": "2026-04-20T08:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/users`

Buat user baru (dipakai dari web admin).

**Request Body:**
```json
{
  "fullName": "Budi Santoso",
  "userId": "VST-001",
  "email": "user@email.com",
  "password": "password123",
  "role": "member",
  "phoneNumber": "08123456789",
  "dateOfBirth": "2000-01-15",
  "category": "student"
}
```

**Field wajib:** `fullName`, `userId` (atau `memberId`), `email`, `password`

---

### `PUT /api/users/:id`

Update data user.

---

### `PATCH /api/users/:id/toggle-status`

Aktifkan / nonaktifkan user (toggle `is_active`).

---

### `DELETE /api/users/:id`

Hapus user permanen.

---

## 6. Attendance (Admin/Web)

> Endpoint ini untuk kebutuhan admin/web. Flutter sebaiknya pakai `/api/flutter/attendance/*`.

### `GET /api/attendance`

Daftar semua absensi. Mendukung filter:

```
?userId=1
?startDate=2026-04-01
?endDate=2026-04-30
?status=present
```

---

### `GET /api/attendance/:id`

Detail absensi berdasarkan ID.

---

### `GET /api/attendance/stats/today`

Statistik absensi hari ini.

**Response `data`:**
```json
{
  "total": 25,
  "present": 20,
  "late": 3,
  "absent": 2
}
```

---

### `GET /api/attendance/trend`

Tren absensi harian.

```
?days=7          // default 7
?userId=1        // opsional, filter per user
```

---

### `GET /api/attendance/leaderboard`

Leaderboard kehadiran.

```
?period=semester    // default "semester"
```

---

### `POST /api/attendance`

Buat record absensi manual (dipakai admin web).

**Request Body:**
```json
{
  "userId": 1,
  "attendanceDate": "2026-04-20",
  "checkInTime": "2026-04-20T08:00:00.000Z",
  "status": "present",
  "notes": "catatan"
}
```

**Field wajib:** `userId`, `attendanceDate`, `checkInTime`, `status`

**`status` value:** `"present"` | `"late"` | `"excused"` | `"sick"` | `"absent"`

---

### `PUT /api/attendance/:id`

Update record absensi.

---

### `DELETE /api/attendance/:id`

Hapus record absensi.

---

## 7. Dashboard

### `GET /api/dashboard/stats`

Statistik keseluruhan untuk halaman dashboard admin.

**Response `data`:**
```json
{
  "totalMembers": 150,
  "todayAttendance": {
    "total": 25,
    "present": 20,
    "late": 3,
    "absent": 2
  },
  "attendanceRate": 87.5,
  "totalPointsAwarded": 1500,
  "topScorer": {
    "user_id": 1,
    "full_name": "Budi Santoso",
    "total_points": 200
  }
}
```

---

### `GET /api/dashboard/activities`

Log aktivitas terbaru di sistem.

```
?limit=10    // default 10
```

---

## 8. Points

### `GET /api/points/logs?userId=1`

Riwayat perolehan poin milik satu user.

**Query Params:**
```
?userId=1    // REQUIRED
```

**Response `data`:** Array of point log objects.

---

### `GET /api/points/leaderboard`

Leaderboard total poin semua user.

```
?limit=50    // default 50
```

**Response `data`:**
```json
[
  {
    "id": 1,
    "full_name": "Budi Santoso",
    "user_id": "VST-001",
    "total_points": 200
  }
]
```

---

### `POST /api/points/quiz`

Tambahkan poin dari quiz ke seorang user.

**Request Body:**
```json
{
  "userId": 1,
  "points": 5
}
```

---

## 9. Data Models

### User
```
id            : integer (PK, auto-increment)
user_id       : string  — Member ID, contoh "VST-001"
full_name     : string
email         : string  (unique)
role          : "admin" | "preacher" | "member" | "staff"
phone_number  : string | null
date_of_birth : string | null  — format YYYY-MM-DD
category      : "student" | "other" | null
total_points  : integer — akumulasi semua poin
is_active     : boolean
last_login    : datetime | null
created_at    : datetime
updated_at    : datetime
```

### Attendance
```
id                : integer (PK)
user_id           : integer (FK -> users.id)
attendance_date   : string   — format YYYY-MM-DD
check_in_time     : datetime — ISO 8601
check_out_time    : datetime | null
status            : "present" | "late" | "excused" | "sick" | "absent"
confidence_score  : float | null   — hasil face recognition (0-100)
liveness_verified : boolean
device_info       : string | null
face_image_url    : string | null
notes             : string | null
created_at        : datetime
updated_at        : datetime
```

### AttendanceSummary
```
user_id        : integer (PK, FK -> users.id)
total_hadir    : integer  — jumlah hadir (present + late)
total_check_in : integer  — jumlah check in
total_check_out: integer  — jumlah check out
```

### PointLog
```
id         : integer (PK)
user_id    : integer (FK -> users.id)
points     : integer   — bisa negatif untuk pengurangan
type       : "attendance" | "quiz" | "bonus" | "penalty"
created_at : datetime
```

---

## 10. Alur Sistem Flutter (Face Attendance)

```
┌─────────────────────────────────────────────────────────────────┐
│                      FLUTTER APP FLOW                           │
└─────────────────────────────────────────────────────────────────┘

1. Kamera aktif → Face Recognition berjalan
        │
        ▼
2. POST /api/flutter/attendance/check-in
   (kirim userId/email/fullName hasil scan + tanggal & jam)
        │
        ├─── requiresRegistration: false
        │    nextStep: "user-dashboard"
        │         │
        │         ▼
        │    Tampilkan User Dashboard
        │    (gunakan data.dashboard dari response)
        │
        └─── requiresRegistration: true
             nextStep: "registration"
                  │
                  ▼
             Tampilkan Form Registrasi
             (isi: fullName, email, phone, DOB, category)
                  │
                  ▼
             POST /api/flutter/attendance/register
                  │
                  ▼
             Tampilkan User Dashboard
             (gunakan data.dashboard dari response)
```

### Poin Otomatis
Setiap absensi `present` atau `late` yang berhasil dicatat untuk **pertama kali** di hari itu, user otomatis mendapat **+10 poin**. Poin tidak diberikan jika user sudah absen di hari yang sama (duplikasi dicegah).

---

## 11. Contoh Retrofit Interface (Flutter/Dart)

### API Client Setup

```dart
import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';

part 'api_client.g.dart';

const String BASE_URL = 'http://10.0.2.2:8080'; // emulator Android

@RestApi(baseUrl: BASE_URL)
abstract class VisiAttendApi {
  factory VisiAttendApi(Dio dio, {String baseUrl}) = _VisiAttendApi;

  // ─── Flutter Attendance ────────────────────────────────────────
  @POST('/api/flutter/attendance/check-in')
  Future<ApiResponse<CheckInResult>> checkIn(
    @Body() CheckInRequest body,
  );

  @POST('/api/flutter/attendance/register')
  Future<ApiResponse<RegisterAttendResult>> registerAndAttend(
    @Body() RegisterRequest body,
  );

  // ─── Auth ──────────────────────────────────────────────────────
  @POST('/api/auth/login')
  Future<ApiResponse<LoginResult>> login(
    @Body() LoginRequest body,
  );

  @POST('/api/auth/refresh')
  Future<ApiResponse<RefreshResult>> refreshToken(
    @Body() RefreshRequest body,
  );

  // ─── Users ────────────────────────────────────────────────────
  @GET('/api/users/{id}/dashboard')
  Future<ApiResponse<UserDashboard>> getUserDashboard(
    @Path('id') int userId,
  );

  // ─── Points ───────────────────────────────────────────────────
  @GET('/api/points/leaderboard')
  Future<ApiResponse<List<LeaderboardItem>>> getLeaderboard({
    @Query('limit') int limit = 50,
  });

  @GET('/api/points/logs')
  Future<ApiResponse<List<PointLog>>> getPointLogs(
    @Query('userId') int userId,
  );
}
```

### Standard Wrapper Model

```dart
@JsonSerializable(genericArgumentFactories: true)
class ApiResponse<T> {
  final bool success;
  final String? message;
  final T? data;

  ApiResponse({required this.success, this.message, this.data});

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object?) fromJsonT,
  ) => _$ApiResponseFromJson(json, fromJsonT);
}
```

### CheckIn Models

```dart
@JsonSerializable()
class CheckInRequest {
  final String attendanceDate;   // "2026-04-20"
  final String checkInTime;      // ISO datetime
  final String? userId;
  final String? memberId;
  final String? email;
  final String? fullName;
  final String? phoneNumber;
  final String? dateOfBirth;
  final String? category;
  final String? deviceInfo;
  final String? notes;

  CheckInRequest({
    required this.attendanceDate,
    required this.checkInTime,
    this.userId,
    this.memberId,
    this.email,
    this.fullName,
    this.phoneNumber,
    this.dateOfBirth,
    this.category,
    this.deviceInfo,
    this.notes,
  });

  factory CheckInRequest.fromJson(Map<String, dynamic> json) =>
      _$CheckInRequestFromJson(json);
  Map<String, dynamic> toJson() => _$CheckInRequestToJson(this);
}

@JsonSerializable()
class CheckInResult {
  final bool requiresRegistration;
  final String nextStep;           // "user-dashboard" | "registration"
  final bool? registered;
  final bool? isNew;
  final String? message;
  final UserModel? user;
  final AttendanceModel? attendance;
  final AttendanceSummary? summary;
  final PointLogModel? pointLog;
  final UserDashboard? dashboard;

  CheckInResult({
    required this.requiresRegistration,
    required this.nextStep,
    this.registered,
    this.isNew,
    this.message,
    this.user,
    this.attendance,
    this.summary,
    this.pointLog,
    this.dashboard,
  });
}
```

---

## 12. Error Handling

### Contoh Error Response

```json
// 400 Bad Request
{
  "success": false,
  "message": "attendanceDate and checkInTime are required"
}

// 401 Unauthorized
{
  "success": false,
  "message": "Email atau password salah"
}

// 404 Not Found
{
  "success": false,
  "message": "User not found"
}

// 500 Server Error
{
  "success": false,
  "message": "Failed to process flutter attendance"
}
```

### Saran Error Handling di Flutter

```dart
try {
  final response = await api.checkIn(request);
  if (response.success && response.data != null) {
    final result = response.data!;
    if (result.requiresRegistration) {
      // Navigasi ke form registrasi
    } else {
      // Navigasi ke dashboard
    }
  }
} on DioException catch (e) {
  final statusCode = e.response?.statusCode;
  final message = e.response?.data['message'] ?? 'Terjadi kesalahan';
  // Tampilkan pesan error ke user
} catch (e) {
  // Unexpected error
}
```

---

## Catatan Teknis

| Hal | Detail |
|-----|--------|
| Database | Microsoft SQL Server (`VISIATTEND_DB`) |
| Auth Token | JWT — simpan `accessToken` di secure storage |
| Duplikasi Absensi | Satu user hanya bisa absen **satu kali per hari** — server mengembalikan data lama jika duplikat |
| Auto-generate Member ID | Jika `userId` tidak dikirim saat registrasi, server otomatis generate |
| Poin Default | Setiap absensi valid (bukan `absent`) = **+10 poin** otomatis |
| `password_hash` | **Tidak pernah dikembalikan** di response manapun |

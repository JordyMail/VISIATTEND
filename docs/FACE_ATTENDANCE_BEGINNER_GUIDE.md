# Panduan Face Attendance Untuk Pemula

Dokumen ini dibuat untuk menjelaskan rencana integrasi AI face attendance pada proyek VISIATTEND dengan bahasa yang pelan-pelan dan mudah diikuti.

Panduan ini membahas:

- arsitektur yang dipakai
- software yang perlu di-install
- langkah pertama kali setup untuk pemula
- langkah run harian setelah project pernah disetup
- cara menjalankan backend Node.js tanpa Docker
- cara menjalankan sandbox AI Python dari awal sampai bisa dipakai
- alur registrasi wajah dan absensi wajah
- langkah integrasi ke Flutter

## 0. Cara Paling Gampang Menjalankan Project Ini

Kalau kamu benar-benar baru pertama kali menjalankan project ini, pakai aturan sederhana ini:

- `pnpm dev` di folder `VISIATTEND` adalah perintah utama untuk menjalankan aplikasi
- setup Python di folder `face-ai` hanya perlu dilakukan saat awal saja
- setelah setup Python selesai, kamu tidak perlu membiarkan terminal Python hidup terus
- saat buka project lagi besok atau setelah restart laptop, biasanya cukup jalankan `pnpm dev` saja

### Setup pertama kali

Kalau baru pertama kali di laptop ini, jalankan:

#### Terminal 1 - aplikasi utama

```powershell
cd E:\CAPSTONE\BE\VISIATTEND
pnpm install
pnpm dev
```

#### Terminal 2 - setup AI Python sekali saja

```powershell
cd E:\CAPSTONE\BE\VISIATTEND\face-ai
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app\main.py setup-models
```

Setelah command Python selesai sukses, terminal kedua boleh ditutup.

### Run harian setelah semua pernah disetup

Kalau project ini sudah pernah berhasil disetup sebelumnya, biasanya cukup:

```powershell
cd E:\CAPSTONE\BE\VISIATTEND
pnpm dev
```

### Kapan setup Python perlu diulang

Ulangi setup Python hanya kalau:

- folder `face-ai\venv` hilang atau rusak
- dependency Python berubah
- folder `face-ai\models` hilang
- pindah ke laptop atau PC lain
- backend error karena tidak menemukan Python, package, atau model AI

## 1. Gambaran Besar Sistem

Rencana yang paling aman dan paling mudah dirawat adalah membagi sistem menjadi 3 bagian:

1. Flutter sebagai frontend
2. Node.js sebagai backend utama
3. Python sebagai modul AI untuk deteksi dan pencocokan wajah

Alurnya seperti ini:

```text
Flutter -> Node.js Backend -> Python Face Service
```

Artinya:

- Flutter tidak perlu bicara langsung ke Python
- Node.js tetap menjadi pintu utama aplikasi
- Python hanya fokus untuk AI wajah dan dipanggil backend saat dibutuhkan

## 2. Kenapa Python Dipisah Dari Node.js

Model AI wajah lebih cocok dijalankan di Python karena library computer vision dan face recognition biasanya lebih matang di Python.

Di sisi lain, backend utama aplikasi lebih cocok tetap di Node.js karena saat ini VISIATTEND sudah memakai Express, route, service, dan database flow di sana.

Jadi pembagian tugasnya menjadi seperti ini:

### Node.js bertugas untuk:

- menerima request dari Flutter
- autentikasi dan validasi user
- business logic attendance
- simpan data ke database
- panggil Python service

### Python bertugas untuk:

- buka model YuNet
- buka model ArcFace
- deteksi wajah
- ambil embedding wajah
- mencocokkan wajah baru dengan wajah yang sudah terdaftar

## 3. Stack Yang Dipakai Saat Ini

### Backend utama VISIATTEND

- Node.js
- Express
- TypeScript
- pnpm

### AI sandbox untuk face attendance

- Python
- OpenCV Contrib
- YuNet untuk face detection
- ArcFace ONNX untuk face embedding
- NumPy

### Frontend mobile

- Flutter

## 4. Folder Yang Perlu Dipahami

### Folder aplikasi utama

Lokasi:

```text
E:\CAPSTONE\BE\VISIATTEND
```

Di sini ada:

- backend Node.js
- frontend web yang sudah ada
- folder AI baru di `face-ai`

### Folder AI yang sekarang dipakai backend

Lokasi:

```text
E:\CAPSTONE\BE\VISIATTEND\face-ai
```

Di sini ada pipeline AI wajah yang sekarang dipakai langsung oleh backend Node.js:

- `app/main.py`
- `app/detector.py`
- `app/embedder.py`
- `app/store.py`
- `app/backend_bridge.py`
- `models/`
- `storage/users/`

## 5. Software Yang Harus Di-install

Sebelum mulai, install dulu software berikut.

### Wajib

1. Git
2. Node.js versi LTS
3. pnpm
4. Python 3
5. Visual Studio Code

### Opsional tapi membantu

1. Flutter SDK
2. Postman

## 6. Cek Instalasi Di Terminal

Buka PowerShell lalu jalankan satu per satu:

```powershell
git --version
node --version
npm --version
pnpm --version
python --version
```

Kalau semua muncul versinya, berarti dasar instalasi sudah siap.

Kalau `pnpm` belum ada, install dengan:

```powershell
npm install -g pnpm
```

## 7. Menjalankan Backend Node.js Tanpa Docker

Ya, backend Node.js bisa jalan tanpa Docker.

Masuk ke folder project utama:

```powershell
cd E:\CAPSTONE\BE\VISIATTEND
```

Install dependency:

```powershell
pnpm install
```

Jalankan backend dan frontend web lokal:

```powershell
pnpm dev
```

Kalau sukses, aplikasi biasanya tersedia di:

```text
http://localhost:8080
```

Catatan:

- perintah ini menjalankan aplikasi utama VISIATTEND
- ini bukan service AI Python
- Node.js tetap bisa jalan tanpa Docker

## 8. Menjalankan AI Python Dari Awal Sampai Akhir

Bagian ini khusus untuk pemula yang ingin menjalankan AI sandbox dari nol.

### Langkah 1. Masuk ke folder AI di dalam VISIATTEND

```powershell
cd E:\CAPSTONE\BE\VISIATTEND\face-ai
```

### Langkah 2. Buat virtual environment Python

```powershell
python -m venv venv
```

Perintah ini membuat folder `venv` agar package Python terpisah dari Python global.

### Langkah 3. Aktifkan virtual environment

```powershell
venv\Scripts\Activate.ps1
```

Kalau berhasil, terminal akan berubah menjadi seperti ini:

```text
(venv) PS E:\CAPSTONE\BE\VISIATTEND\face-ai>
```

Kalau PowerShell menolak script activation, jalankan dulu:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
venv\Scripts\Activate.ps1
```

### Langkah 4. Install dependency Python

```powershell
pip install -r requirements.txt
```

Package penting yang akan ter-install:

- `opencv-contrib-python`
- `numpy`

### Langkah 5. Download model AI

```powershell
python app\main.py setup-models
```

Perintah ini akan menyiapkan:

- model YuNet untuk deteksi wajah
- model ArcFace untuk embedding wajah

Kalau sukses, file model akan ada di folder `models`.

### Langkah 6. Cek command yang tersedia

```powershell
python app\main.py --help
```

Command penting yang tersedia:

- `detect`
- `enroll`
- `register-camera`
- `verify`
- `attendance-camera`
- `webcam`

## 9. Alur Registrasi Wajah Dari Webcam

Ini flow yang paling mirip kebutuhan aplikasi.

Jalankan:

```powershell
python app\main.py register-camera
```

Yang akan terjadi:

1. terminal meminta nama
2. terminal meminta `user_id` opsional
3. kamera terbuka
4. arahkan wajah ke kamera
5. tekan `c` untuk menyimpan registrasi
6. wajah diproses oleh YuNet dan ArcFace
7. embedding wajah disimpan ke file JSON user

Kalau batal, tekan `q` di window kamera.

File yang dihasilkan:

- gambar hasil anotasi di folder `output/`
- data wajah user di folder `storage/users/`

## 10. Alur Absensi Wajah Dari Webcam

Jalankan:

```powershell
python app\main.py attendance-camera
```

Yang akan terjadi:

1. kamera terbuka
2. arahkan wajah ke kamera
3. tekan `c`
4. sistem mengambil wajah utama
5. sistem membandingkan wajah baru dengan data user yang sudah terdaftar
6. kalau similarity cukup tinggi, absensi dianggap berhasil
7. log absensi disimpan

File log absensi disimpan di:

```text
storage/attendance_logs.jsonl
```

## 11. Kalau Ada 2 Atau 3 Wajah Sekaligus

Untuk sandbox yang sekarang, sistem tidak akan memproses semua wajah sekaligus.

Logikanya seperti ini:

- semua wajah tetap bisa terdeteksi
- sistem mengurutkan wajah berdasarkan ukuran bounding box
- wajah terbesar dianggap sebagai wajah utama
- hanya wajah utama itu yang dipakai untuk registrasi atau absensi

Jadi hasil absensi hanya untuk 1 orang, bukan 2 atau 3 orang sekaligus.

## 12. Data Yang Disimpan Per User

Saat user berhasil registrasi, data tidak disimpan sebagai identitas gambar utama.

Yang paling penting justru adalah vector wajah atau embedding.

Format penyimpanan saat ini:

- satu file JSON per user
- setiap user bisa punya beberapa sample embedding
- ada metadata nama, waktu, bounding box, dan landmark

Contoh lokasi file:

```text
storage/users/VST-001.json
```

Isi penting di dalam file:

- `user_id`
- `name`
- `embedding_dim`
- `samples[]`
- `embedding` berupa list angka float

## 13. Fungsi YuNet Dan ArcFace

### YuNet

YuNet dipakai untuk:

- mendeteksi lokasi wajah
- membuat bounding box
- menghasilkan 5 landmark wajah

### ArcFace

ArcFace dipakai untuk:

- menerima wajah yang sudah di-align
- mengubah wajah menjadi vector angka
- vector itu dipakai untuk membandingkan identitas wajah

Sederhananya:

- YuNet mencari wajahnya
- ArcFace mengenali ciri khas wajahnya

## 14. Integrasi Ke Backend Node.js

Kalau nanti mau masuk ke sistem utama VISIATTEND, langkah yang disarankan adalah:

1. Flutter kirim foto ke Node.js
2. Node.js kirim foto ke Python face service
3. Python balikin hasil deteksi dan hasil match
4. Node.js simpan attendance ke database
5. Node.js kirim response final ke Flutter

Alur sederhananya:

```text
Flutter -> Node.js -> Python AI -> Node.js -> Flutter
```

## 15. Kenapa Flutter Sebaiknya Tidak Langsung Ke Python

Supaya arsitektur tetap rapi.

Kalau Flutter langsung ke Python, nanti akan sulit untuk:

- validasi business rule
- autentikasi
- sinkron dengan database utama
- audit log attendance
- pengelolaan error yang konsisten

Makanya yang lebih aman adalah Flutter tetap lewat Node.js.

## 16. Langkah Yang Disarankan Untuk Tahap Pengembangan

Urutan kerja yang paling aman adalah:

1. pastikan AI di folder `face-ai` berjalan stabil
2. registrasi beberapa user dari webcam
3. test absensi dari webcam
4. sambungkan Flutter ke endpoint Node.js
5. tune threshold berdasarkan data nyata
6. tambahkan liveness detection nanti

## 17. Endpoint Backend Yang Sudah Ditambahkan

Di backend Node.js sekarang sudah ada endpoint face flow baru pada group Flutter attendance:

- `POST /api/flutter/attendance/face/register/start`
- `POST /api/flutter/attendance/face/register-capture`
- `POST /api/flutter/attendance/face/register`
- `POST /api/flutter/attendance/face/check-in`

Arti masing-masing:

1. `face/register/start`
Dipakai saat user isi form data lebih dulu sebelum training wajah dimulai.

2. `face/register-capture`
Dipakai untuk training 3 kali setelah form registrasi awal sudah disimpan.

3. `face/register`
Dipakai untuk finalisasi registrasi setelah 3 capture selesai. Endpoint ini akan membuat member dan menyimpan face profile permanen.

4. `face/check-in`
Dipakai saat user sudah pernah terdaftar dan ingin langsung absen dengan 1 kali capture.

## 18. Flow Registrasi Wajah Yang Sekarang Dipakai Flutter

Untuk registrasi user baru, urutannya sekarang bukan lagi capture dulu.

Urutan yang dipakai sekarang adalah:

1. user pilih menu registrasi wajah
2. user isi form biodata dulu
3. Flutter kirim form ke `POST /api/flutter/attendance/face/register/start`
4. backend balikin `sessionId` dan `nextStep: face-training`
5. user capture wajah 3 kali ke `POST /api/flutter/attendance/face/register-capture`
6. kalau sample sudah 3, backend balikin `nextStep: face-register-finalize`
7. Flutter panggil `POST /api/flutter/attendance/face/register` dengan `sessionId`
8. backend membuat member, menyimpan face profile, lalu balikin `nextStep: user-dashboard`

Jadi untuk user baru:

- isi form dulu
- baru training 3 capture
- baru masuk dashboard user

Untuk user lama yang sudah pernah registrasi:

- cukup 1 kali capture lewat `face/check-in`
- kalau wajah cocok, attendance langsung dicatat
- backend balikin dashboard user

## 19. Cara Backend Node.js Menjalankan AI Tanpa Docker

Backend Node.js sekarang tidak perlu Docker untuk bicara dengan AI.

Yang dipakai adalah Python bridge dari folder `face-ai` di dalam repo ini.

Secara konsep seperti ini:

```text
Node.js -> jalankan python app/backend_bridge.py -> dapat JSON hasil AI
```

Secara default backend akan mencari:

- project AI di `E:\CAPSTONE\BE\VISIATTEND\face-ai`
- python executable di `E:\CAPSTONE\BE\VISIATTEND\face-ai\venv\Scripts\python.exe`
- bridge script di `E:\CAPSTONE\BE\VISIATTEND\face-ai\app\backend_bridge.py`

Kalau suatu saat path berubah, bisa override lewat environment variable:

- `FACE_AI_PROJECT_ROOT`
- `FACE_AI_PYTHON_EXECUTABLE`
- `FACE_AI_BRIDGE_SCRIPT`

## 20. Checklist Cepat Untuk Teman Yang Baru Mulai

Kalau teman Anda benar-benar baru, checklist ini bisa diikuti:

1. install Git, Node.js, pnpm, Python, dan VS Code
2. buka PowerShell
3. jalankan project Node.js dengan `pnpm install` lalu `pnpm dev`
4. masuk ke folder `E:\CAPSTONE\BE\VISIATTEND\face-ai`
5. buat `venv`
6. aktifkan `venv`
7. `pip install -r requirements.txt`
8. `python app\main.py setup-models`
9. `python app\main.py register-camera`
10. `python app\main.py attendance-camera`

## 20. Hal Yang Perlu Ditingkatkan Nanti

Sandbox saat ini sudah cukup bagus untuk eksperimen awal, tapi untuk production masih perlu beberapa peningkatan:

- liveness detection atau anti spoofing
- threshold similarity yang dituning dari data nyata
- validasi kualitas gambar yang lebih ketat
- penyimpanan embedding yang lebih rapi daripada JSON file
- integrasi resmi ke backend Node.js

## 21. Ringkasan Singkat

Kalau disingkat sekali:

- backend Node.js bisa jalan tanpa Docker
- AI Python juga bisa jalan tanpa Docker
- Flutter sebaiknya hanya bicara ke Node.js
- Python dipakai khusus untuk YuNet dan ArcFace
- registrasi awal dan absensi webcam sudah bisa diuji di folder `face-ai`

Kalau teman Anda bingung mulai dari mana, suruh mulai dari bagian ini dulu:

1. Section 7 untuk menjalankan Node.js
2. Section 8 untuk menjalankan Python AI
3. Section 9 dan 10 untuk mencoba registrasi dan absensi
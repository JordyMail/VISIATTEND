# Docker Setup & Deployment Guide

Panduan lengkap untuk setup dan jalankan VISIATTEND Backend dengan Docker Compose.

---

## 📋 Requirements

### System Requirements
- Docker Desktop (Windows/Mac) atau Docker + Docker Compose (Linux)
- 4GB RAM minimum (8GB recommended)
- 10GB disk space minimum
- Windows 10+ / macOS 10.14+ / Ubuntu 18.04+

### Installed Tools
- Docker: `docker --version` harus 20.10+
- Docker Compose: `docker-compose --version` harus 1.29+

### Download & Install

**Windows / Mac:**
- Download Docker Desktop dari: https://www.docker.com/products/docker-desktop

**Linux (Ubuntu):**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

---

## 🚀 Quick Start (5 Minutes)

### 1. Verify Installation

```bash
docker --version
docker-compose --version
docker run hello-world
```

### 2. Clone/Prepare Repository

```bash
cd e:\CAPSTONE\BE\VISIATTEND
# atau direktori BE Anda
```

### 3. Setup Environment Variables

**File: `.env` (di root BE)**

```bash
# Database
DB_HOST=sqlserver
DB_PORT=1433
DB_NAME=VISIATTEND_DB
DB_USER=sa
DB_PASSWORD=TempPass!2026

# JWT
JWT_SECRET=super-secret-jwt-key-change-this-in-production
JWT_ACCESS_EXPIRY=12h
JWT_REFRESH_EXPIRY=7d

# Server
PORT=8080
NODE_ENV=development

# Face Service
FACE_SERVICE_URL=http://face-service:8000
```

### 4. Build & Start Services

```bash
# Download dan build semua image (first time, 10-15 menit)
docker-compose build

# Jalankan semua services
docker-compose up -d

# Lihat status services
docker-compose ps
```

### 5. Verify Services Running

```bash
# Health check API
curl http://localhost:8080/health

# Health check Face Service
curl http://localhost:8000/health

# Check SQL Server
sqlcmd -S localhost -U sa -P TempPass!2026 -Q "SELECT 1"
```

### 6. Access Applications

- API Backend: http://localhost:8080
- Face Service API: http://localhost:8000
- Face Service Docs: http://localhost:8000/docs
- SQL Server: localhost:1433

---

## 📊 Docker Compose Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Docker Network                             │
│              (visiattend-network)                            │
└──────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
    ┌────────────┐      ┌──────────────┐    ┌────────────┐
    │   API      │      │   Face       │    │ SQL Server │
    │ (Node.js)  │      │  Service     │    │ (2022)     │
    │ :8080      │      │  (Python)    │    │ :1433      │
    │            │◄─────┤   :8000      │    │            │
    │ Calls      │      │              │    │            │
    │ Face API   │      │ Calls        │    │ Stores     │
    │            │      │ DeepFace     │    │ Data       │
    └────────────┘      │              │    └────────────┘
         ▲               │ Stores       │
         │               │ Embeddings   │
         │               └──────────────┘
         └──────────────────┤
           From Flutter
```

---

## 🔧 Common Docker Commands

### Manage Services

```bash
# Start all services (background)
docker-compose up -d

# Start with logs visible
docker-compose up

# Stop all services (keeps data)
docker-compose stop

# Stop dan remove containers (keeps data)
docker-compose down

# Stop everything dan delete volumes (WIPES DATA)
docker-compose down -v

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart api
docker-compose restart face-service
docker-compose restart sqlserver
```

### View Logs

```bash
# All services logs (live)
docker-compose logs -f

# Specific service logs
docker-compose logs -f api
docker-compose logs -f face-service
docker-compose logs -f sqlserver

# Last 50 lines
docker-compose logs --tail=50 api

# Logs dari 5 menit terakhir
docker-compose logs --since=5m api
```

### Check Status

```bash
# List all services status
docker-compose ps

# Detailed stats
docker stats

# List Docker images
docker images

# List containers
docker ps -a
```

### Execute Commands in Container

```bash
# SQL Server: Run query
docker-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P TempPass!2026 -Q "SELECT @@VERSION"

# Python Face Service: Run Python command
docker-compose exec face-service python -c "import deepface; print('DeepFace ready')"

# Node.js API: Run npm command
docker-compose exec api npm list
```

---

## 📝 Detailed Setup Steps untuk Pemula

### Step 1: Persiapan Folder

```bash
# Navigate ke BE directory
cd e:\CAPSTONE\BE\VISIATTEND

# Pastikan struktur folder
# VISIATTEND/
# ├── server/              (existing Node.js code)
# ├── face-service/        (existing Python code)
# ├── docker-compose.yml   (just created)
# ├── Dockerfile           (for Node.js, pastikan sudah ada)
# └── .env                 (create if not exists)

# List folder untuk verify
ls -la
```

### Step 2: Create Dockerfile untuk Node.js API

**File: `VISIATTEND/Dockerfile`** (jika belum ada)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
```

### Step 3: Create Environment File

**File: `VISIATTEND/.env`**

```bash
# Server
PORT=8080
NODE_ENV=development

# Database
DB_HOST=sqlserver
DB_PORT=1433
DB_NAME=VISIATTEND_DB
DB_USER=sa
DB_PASSWORD=TempPass!2026

# JWT
JWT_SECRET=your-super-secret-key-here
JWT_ACCESS_EXPIRY=12h
JWT_REFRESH_EXPIRY=7d

# Face Service
FACE_SERVICE_URL=http://face-service:8000
```

### Step 4: Build Images (First Time Only)

```bash
# Navigate ke project root
cd e:\CAPSTONE\BE\VISIATTEND

# Build all images (this takes 10-15 minutes)
docker-compose build

# Atau rebuild specific service
docker-compose build --no-cache api
docker-compose build --no-cache face-service
```

### Step 5: Start Services

```bash
# Start all in background
docker-compose up -d

# Tunggu ~30 detik untuk services stabilize
# Check status
docker-compose ps
```

Expected output:
```
NAME                       STATUS              PORTS
visiattend-api            Up (healthy)        0.0.0.0:8080->8080/tcp
visiattend-face-service   Up (healthy)        0.0.0.0:8000->8000/tcp
visiattend-sqlserver      Up (healthy)        0.0.0.0:1433->1433/tcp
```

### Step 6: Initialize Database

```bash
# Tunggu SQL Server fully ready (30-60 detik)
# Lalu run migration
docker-compose exec api npm run db:setup

# Atau run manually
docker-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P TempPass!2026 < server/db/schema.sql
```

### Step 7: Test All Services

```bash
# Test API health
curl http://localhost:8080/health

# Test Face Service health
curl http://localhost:8000/health

# Test database connection
docker-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P TempPass!2026 -Q "SELECT @@VERSION"
```

---

## 🐛 Troubleshooting

### Issue: Ports Already in Use

```bash
# Check what's using port 8080
netstat -tuln | grep 8080  # Linux/Mac
netstat -ano | findstr :8080  # Windows

# Kill process on port 8080 (Linux/Mac)
lsof -ti:8080 | xargs kill -9

# Kill process on port 8080 (Windows)
taskkill /PID <PID> /F

# Or change port di docker-compose.yml
# "8081:8080" instead of "8080:8080"
```

### Issue: Out of Disk Space

```bash
# Clean up unused Docker resources
docker system prune -a

# Remove only unused images
docker image prune -a

# Check disk usage
docker system df
```

### Issue: Container Stuck/Not Starting

```bash
# View detailed logs
docker-compose logs -f api
docker-compose logs -f face-service

# Force restart
docker-compose restart api

# Or remove and recreate
docker-compose down api
docker-compose up -d api
```

### Issue: Database Connection Error

```bash
# Check if SQL Server is ready
docker-compose logs sqlserver

# Test connection
docker-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P TempPass!2026 -Q "SELECT 1"

# Restart SQL Server
docker-compose restart sqlserver
```

### Issue: Face Service Model Loading Slow

```bash
# This is normal! First startup takes 1-2 minutes
# Model is ~100MB dan di-load ke RAM

# Check progress
docker-compose logs -f face-service

# Increase memory limit di docker-compose.yml
deploy:
  resources:
    limits:
      memory: 2G
    reservations:
      memory: 1G
```

### Issue: DeepFace Not Detecting Faces

```bash
# Test face detection
curl -X POST "http://localhost:8000/api/face/verify" \
  -F "file=@test_face.jpg"

# Cek log
docker-compose logs -f face-service

# Pastikan image jelas dan wajah visible
```

---

## 🔐 Security Considerations

### Development Only!

Configuration saat ini untuk **development saja**. Untuk production:

```bash
# Change these:
DB_PASSWORD=TempPass!2026          # JANGAN gunakan ini!
JWT_SECRET=super-secret-...        # Generate random key
MSSQL_SA_PASSWORD=TempPass!2026    # JANGAN gunakan ini!

# Generate secure password:
openssl rand -base64 32
```

### Production Checklist

- [ ] Change all default passwords
- [ ] Use environment variables dengan secrets manager
- [ ] Enable HTTPS/SSL
- [ ] Restrict Docker port access
- [ ] Use Docker secrets atau vault
- [ ] Enable authentication di SQL Server
- [ ] Regular backups
- [ ] Monitoring & logging setup

---

## 📈 Performance Tuning

### Memory Limits

```yaml
# docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
  
  face-service:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
  
  sqlserver:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1.5G
```

### CPU Limits

```yaml
  deploy:
    resources:
      limits:
        cpus: "2.0"
      reservations:
        cpus: "1.0"
```

---

## 🆘 Getting Help

### View All Logs

```bash
# Save all logs to file
docker-compose logs > logs.txt 2>&1

# Or dari individual services
docker-compose logs api > api.log
docker-compose logs face-service > face-service.log
docker-compose logs sqlserver > sqlserver.log
```

### Debug Mode

```bash
# Enable debug logging di .env
DEBUG=true
LOG_LEVEL=DEBUG

# Restart services
docker-compose restart

# View detailed logs
docker-compose logs -f
```

### System Information

```bash
# Docker version
docker version

# System info
docker info

# All containers info
docker-compose config

# Network inspection
docker network inspect visiattend-network
```

---

## ✅ Checklist Produksi

- [ ] Semua service healthy: `docker-compose ps`
- [ ] API responding: `curl http://localhost:8080/health`
- [ ] Face Service responding: `curl http://localhost:8000/health`
- [ ] Database accessible dan initialized
- [ ] Face embeddings storage readable/writable
- [ ] Logs tidak ada error
- [ ] Data volumes persistent
- [ ] Backup strategy defined
- [ ] Monitoring configured
- [ ] CORS properly set

---

## 📚 Useful References

- Docker Docs: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/
- Node.js Docker: https://hub.docker.com/_/node
- Python Docker: https://hub.docker.com/_/python
- SQL Server Docker: https://hub.docker.com/_/microsoft-mssql-server

---

## 🎯 Next Steps

1. ✅ Jalankan `docker-compose up -d`
2. ✅ Verify semua services healthy
3. ✅ Test API endpoints
4. ✅ Setup Flutter untuk connect ke `http://10.0.2.2:8080` (Android emulator)
5. ✅ Test face registration & attendance flow end-to-end

Happy deploying! 🚀

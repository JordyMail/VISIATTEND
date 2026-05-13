# Docker Setup Guide for VISIATTEND

## Overview

Docker Compose untuk project ini menjalankan 2 service utama:

- Node.js API di port `8080`
- Microsoft SQL Server di port `1433`

Semua komponen Python dan face recognition sudah dihapus dari stack ini.

## Prerequisites

- Docker Desktop aktif
- Port `8080` dan `1433` tersedia

## Run the Stack

```bash
docker-compose up --build
```

Mode background:

```bash
docker-compose up -d --build
```

## Verify Services

```bash
curl http://localhost:8080/health
docker-compose ps
```

## Service Endpoints

- API: `http://localhost:8080`
- SQL Server: `localhost:1433`

## Environment Variables

Nilai default sudah didefinisikan di `docker-compose.yml`. Jika perlu override, gunakan file `.env`.

```env
NODE_ENV=development
PORT=8080
DB_HOST=sqlserver
DB_PORT=1433
DB_NAME=VISIATTEND_DB
DB_USER=sa
DB_PASSWORD=TempPass!2026
JWT_SECRET=super-secret-jwt-key-change-this-in-production
JWT_ACCESS_EXPIRY=12h
JWT_REFRESH_EXPIRY=7d
```

## Common Commands

```bash
docker-compose up -d
docker-compose down
docker-compose logs -f api
docker-compose logs -f sqlserver
docker-compose restart api
docker-compose restart sqlserver
```

## Architecture

```text
Client Apps
  |
  v
Node.js API (:8080)
  |
  v
SQL Server (:1433)
```

## Troubleshooting

API tidak sehat:

```bash
docker-compose logs -f api
```

SQL Server tidak sehat:

```bash
docker-compose logs -f sqlserver
```

Reset container dan volume:

```bash
docker-compose down -v
docker-compose up --build
```

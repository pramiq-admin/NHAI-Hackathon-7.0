# NHAI Face Auth -- Datalake 3.0 Integration Guide

> **Version:** 0.1.0 | **Last updated:** 2026-05-30

---

## 1. API Surface

Base URL: `https://<your-host>:8000/api/v1`

All endpoints (except `/healthz`) require a Bearer JWT obtained from the auth endpoint.

### 1.1 POST `/auth/token` -- Device Authentication

Exchange a device identifier and shared secret for a short-lived JWT.

```bash
curl -X POST https://host:8000/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"device_id": "NHAI-DEVICE-042", "shared_secret": "<rotated-secret>"}'
```

**Response:**

```json
{"access_token": "eyJhbG...", "token_type": "bearer", "expires_in": 900}
```

> **Note:** This endpoint is disabled by default (`DEVICE_TOKEN_ENABLED=false`, returns 410 Gone). Enable it only after rotating `DEVICE_SHARED_SECRET` away from its default. The newer `POST /admin/login` and `POST /worker/login` role-based flows are preferred.

### 1.2 POST `/attendance` -- Batch Sync Attendance Events

Idempotent upsert (ON CONFLICT DO NOTHING on `event_id`). Rate-limited, body capped at 256 KB, max 100 events per batch.

```bash
curl -X POST https://host:8000/api/v1/attendance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "event_id": "1716000000000-abc1234",
        "user_id": "W-00123",
        "user_name": "Ramesh Kumar",
        "device_id": "NHAI-DEVICE-042",
        "timestamp": "2026-05-30T08:15:00Z",
        "cosine_score": 0.87,
        "liveness_passed": true,
        "pad_score": 0.94,
        "latency_ms": 312,
        "gps_lat": 28.6139,
        "gps_lon": 77.2090,
        "notes": "Morning check-in"
      }
    ]
  }'
```

**Response:**

```json
{
  "accepted": ["1716000000000-abc1234"],
  "rejected": [],
  "server_ack": "a3f2c7...sha256"
}
```

- `accepted` -- events inserted for the first time.
- `rejected` -- duplicate `event_id` values (already synced).
- `server_ack` -- SHA-256 over sorted event IDs; the client stores this to confirm sync.
- The server overrides `device_id` from the JWT subject (IDOR protection).

### 1.3 GET `/attendance` -- Query Attendance

```bash
curl "https://host:8000/api/v1/attendance?user_id=W-00123&date_from=2026-05-01T00:00:00Z&date_to=2026-05-31T23:59:59Z&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

| Parameter   | Type     | Notes                                     |
|-------------|----------|-------------------------------------------|
| `user_id`   | string?  | Filter by worker ID                       |
| `device_id` | string?  | Filter by device                          |
| `date_from` | datetime?| ISO-8601, inclusive                        |
| `date_to`   | datetime?| ISO-8601, inclusive                        |
| `limit`     | int      | Default 100, max 1000                     |

Date range is capped at 366 days to prevent full-table scans.

### 1.4 GET `/healthz` -- Health Check

```bash
curl https://host:8000/api/v1/healthz
# {"status": "ok", "service": "nhai-face-auth"}
```

---

## 2. React Native Module Integration

The face-auth module ships as a standard React Native project. To embed it inside an existing NHAI app:

### 2.1 Install as a Local Package

```bash
# From your host app root:
npm install ../NhaiHackthon-7/frontend
# or add to package.json:
"nhai-face-auth": "file:../NhaiHackthon-7/frontend"
```

### 2.2 Callback Contract

**Enrollment** (`useEnrollment` hook):

```ts
const enrollment = useEnrollment();
enrollment.startEnrollment(userId, userName);
// Feed each frame's embedding via:
enrollment.captureEmbedding(embedding: number[]);
// Observe results:
enrollment.step;       // 'idle'|'frontal'|'left'|'right'|'processing'|'done'|'error'
enrollment.enrolledId; // string | null (set on success)
enrollment.error;      // string | null
enrollment.duplicate;  // {existingRole, existingName} | null
```

**Verification** (`useFaceAuth` + `useLiveness` hooks):

```ts
// Pipeline stages: 'idle' → 'liveness' → 'verifying' → 'done'
// On match, the VerificationScreen calls enqueueEvent() automatically:
enqueueEvent({
  event_id, user_id, user_name, device_id,
  timestamp,        // ISO-8601
  cosine_score,     // 0..1
  liveness_passed,  // boolean
  pad_score?,       // anti-spoof confidence
  latency_ms?,      // end-to-end pipeline time
});
```

### 2.3 Attendance Event Format

Events are queued locally in SQLite (`react-native-quick-sqlite`) and batch-synced to `POST /attendance` when connectivity is available. Each event carries the fields listed in section 1.2.

---

## 3. Deployment

### 3.1 Docker Compose (one command)

```bash
cd backend
cp .env.example .env
# Edit .env -- fill ALL "CHANGE_ME" values
docker compose up -d
```

This starts four services:

| Service      | Port  | Purpose                          |
|--------------|-------|----------------------------------|
| `db`         | 5432  | PostgreSQL 16 (loopback-only)    |
| `api`        | 8000  | FastAPI application              |
| `prometheus` | 9090  | Metrics scraper (loopback-only)  |
| `grafana`    | 3000  | Dashboards (loopback-only)       |

### 3.2 Required Environment Variables

| Variable                | Required | Notes                                      |
|-------------------------|----------|--------------------------------------------|
| `ENV`                   | Yes      | `dev` or `production`                      |
| `POSTGRES_USER`         | Yes      | DB username                                |
| `POSTGRES_PASSWORD`     | Yes      | DB password (rotate from default)          |
| `POSTGRES_DB`           | Yes      | Database name                              |
| `JWT_SECRET`            | Yes      | 32+ byte random string                    |
| `AADHAR_PEPPER`         | Yes      | Server-side HMAC pepper for Aadhar hashing |
| `CORS_ORIGINS`          | Prod     | JSON array, no `*` in production           |
| `GRAFANA_ADMIN_PASSWORD`| Yes      | Grafana dashboard login                    |
| `METRICS_BEARER_TOKEN`  | Optional | Set to expose `/metrics` endpoint          |
| `DEVICE_TOKEN_ENABLED`  | Optional | `true` to enable legacy device-token flow  |
| `DEVICE_SHARED_SECRET`  | Cond.    | Required if `DEVICE_TOKEN_ENABLED=true`    |

Generate secrets with:

```bash
python -c "from app.config import generate_secret; print(generate_secret())"
```

### 3.3 Database Migrations

```bash
cd backend
# Run migrations against the live DB:
alembic upgrade head

# Create a new migration after model changes:
alembic revision --autogenerate -m "describe change"
```

The `DATABASE_URL` is read from the `.env` file by `alembic/env.py`. The compose file also auto-creates tables on first boot via SQLAlchemy `metadata.create_all`.

---

## 4. Datalake 3.0 Integration Pattern

```
+------------------+      batch POST       +------------------+
| NHAI Mobile App  | --------------------> | Face Auth API    |
| (React Native)   |  /api/v1/attendance   | (FastAPI)        |
+------------------+                       +--------+---------+
                                                    |
                                                    v
                                           +--------+---------+
                                           | PostgreSQL 16    |
                                           | attendance_records|
                                           +--------+---------+
                                                    |
                                            ETL / CDC pipe
                                                    |
                                                    v
                                           +--------+---------+
                                           | Datalake 3.0     |
                                           | (existing NHAI)  |
                                           +------------------+
```

The Datalake connector can either:
- **Pull:** Poll `GET /attendance` with date filters on a schedule.
- **Push:** Add a CDC (Change Data Capture) trigger on the `attendance_records` table to stream rows into the Datalake pipeline.

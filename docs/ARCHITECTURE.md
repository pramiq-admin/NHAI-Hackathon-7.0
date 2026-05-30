# NHAI Face Authentication -- Technical Architecture

## 1. System Overview

An offline-first biometric attendance system for NHAI highway construction
workers. All face recognition runs **on-device** -- no biometric data leaves
the phone.

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Mobile app | React Native 0.85.3 (Android) | Camera, ML inference, offline storage |
| ML runtime | react-native-fast-tflite (NNAPI delegate) | YuNet, EdgeFace-XS, MiniFASNet |
| Local DB | SQLite + SQLCipher (AES-256) | Templates, punch events |
| Key storage | react-native-keychain (Android Keystore / StrongBox) | SQLCipher master key, JWTs |
| Backend | FastAPI (Python 3.11+) | Attendance sync, admin panel, auth |
| Database | PostgreSQL (asyncpg) | Attendance records, worker/admin accounts |
| OTA models | Firebase Remote Config + Storage | Model versioning, signed .tflite delivery |
| Observability | Prometheus + Grafana | Endpoint latency, sync rates, error budgets |


## 2. Component Architecture

### 2.1 On-Device ML Pipeline

```
Camera Frame (VisionCamera)
        |
        v
+-------------------+
| YuNet TFLite      |  Face detection (160x120 input)
| conf > 0.4, NMS   |  Outputs: bbox + 5 landmarks
+-------------------+
        |
        v
+-------------------+
| Face Alignment    |  ArcFace 5-point similarity transform
| (Affine Warp)     |  Crops + warps to 112x112
+-------------------+
        |
        v
+-------------------+
| EdgeFace-XS       |  Embedding extraction
| TFLite (112x112)  |  Output: 512-d L2-normalized vector
+-------------------+
        |
        v
+-------------------+
| MagFace Quality   |  L2 magnitude before normalization
| Gate (mag > 18)   |  Rejects blurry / partial faces
+-------------------+
        |
        v
+-------------------+
| Cosine Match      |  Compare against template cache
| threshold >= 0.5  |  Adaptive per-user threshold (Phase 7)
+-------------------+
        |
        v
+-------------------+
| BioHash Verify    |  ISO/IEC 24745 cancellable template
| Hamming < 0.35    |  512-bit binary hash from projection
+-------------------+
        |
        v
+-------------------+
| MiniFASNet PAD    |  Passive anti-spoof (2 models fused)
| realScore > 0.5   |  softmax(V2) + softmax(V1-SE) / 2
+-------------------+
        |
        v
+-------------------+
| Active Challenges |  Random 3-of-4: blink, head turn,
| (Liveness)        |  smile -- 6s timeout per step
+-------------------+
        |
        v
    MATCH / REJECT
```

### 2.2 Storage Layer

```
+----------------------------+
| react-native-keychain      |
| (Android Keystore/StrongBox)|
|                            |
|  sqlite_master_key (256-bit)|
|  JWT tokens                |
+----------------------------+
            |
            v  key
+----------------------------+
| SQLite + SQLCipher         |
| nhai_face_auth.db          |
|                            |
|  templates                 |
|    id, user_id, name,      |
|    emb (512-d JSON),       |
|    bio_hash (512-bit),     |
|    salt (32-char)          |
|                            |
|  punch_events              |
|    id, worker_id, type,    |
|    timestamp, gps_*,       |
|    face_match_score,       |
|    liveness_passed,        |
|    synced, sync_attempts   |
+----------------------------+
```

Key design decisions:
- **Embeddings stay on-device.** The server never sees raw face vectors.
- **BioHash is one-way.** Even if the DB is extracted, the original embedding
  cannot be reconstructed from the 512-bit hash.
- **SQLCipher master key** is generated via libsodium `randombytes_buf(32)` on
  first launch and stored in Android Keystore (TEE-backed where available).

### 2.3 Sync Engine (Offline-First)

```
+------------------+     +-------------------+     +------------------+
| punch_events     | --> | punchSyncWorker   | --> | FastAPI Backend   |
| (SQLite, local)  |     |                   |     | POST /api/v1/    |
| synced=0 rows    |     | Batch of 50       |     | punch-events/    |
+------------------+     | withRetry(2)      |     | batch-sync       |
                          | exp backoff       |     +------------------+
                          | 1s..16s + jitter  |             |
                          +-------------------+             v
                                  ^               +------------------+
                                  |               | PostgreSQL       |
                          triggered by:           | ON CONFLICT      |
                          - NetInfo reconnect     | DO NOTHING       |
                          - AppState foreground   | (idempotent)     |
                          - Manual pull-to-refresh+------------------+
                                                          |
                          +-------------------+           v
                          | Legacy sync path  |   server_ack = SHA256
                          | attendanceUploader|   (sorted event_ids)
                          | (AsyncStorage Q)  |
                          +-------------------+
```

Retry policy: exponential backoff with jitter, base 1s, cap 16s, max 5
retries (2 for punch sync). Server responds with `{accepted, rejected,
server_ack}`. Rejected = already-exists (idempotent). After ACK, local rows
are marked `synced=1`.

### 2.4 Backend Architecture

```
FastAPI app
  |
  +-- /api/v1/healthz                    GET   health check
  |
  +-- /api/v1/auth/token                 POST  legacy device JWT (410 by default)
  |
  +-- /api/v1/admin/
  |     +-- signup                        POST  admin registration (face + Aadhaar)
  |     +-- login                         POST  admin face login
  |     +-- workers                       GET   list workers
  |     +-- workers/{id}/calendar         GET   attendance calendar
  |
  +-- /api/v1/workers/
  |     +-- register                      POST  worker registration by admin
  |     +-- auth/face-login               POST  worker face login -> JWT
  |
  +-- /api/v1/punch-events/
  |     +-- batch-sync                    POST  batch upload (worker JWT)
  |     +-- my                            GET   worker's own events
  |
  +-- /api/v1/attendance                  POST  legacy batch sync (device JWT)
  |                                       GET   query with date range
  |
  +-- /metrics                            GET   Prometheus (bearer-gated)

Middleware stack:
  1. CORS (origin-locked in production)
  2. BodySizeLimitMiddleware (256 KB cap)
  3. slowapi rate limiter (per-IP on auth endpoints)
  4. Play Integrity verification (per-request on sync)
  5. JWT auth (HS256, 15-min expiry for devices, 12h for admin/worker)
```

### 2.5 OTA Model Updates

```
+------------------+      +-------------------+      +------------------+
| Firebase Remote  | ---> | modelDownloader   | ---> | signatureVerifier|
| Config           |      |                   |      |                  |
| model_version    |      | Download .tflite  |      | Ed25519 verify   |
| model_url        |      | Download .sig     |      | (libsodium)      |
| model_sig_url    |      +-------------------+      | pubkey bundled   |
+------------------+               |                  +------------------+
                                   v                          |
                          version != local?            signature valid?
                            yes -> download              yes -> install
                            no  -> skip                  no  -> delete + abort
                                   |
                                   v
                          +-------------------+
                          | Atomic replace    |
                          | models/ directory |
                          | Update version in |
                          | AsyncStorage      |
                          +-------------------+
```

The public key (`qlTr13nY5NcmRoigNa6FSQ1+z8WSFlUxyKKkIYDmeNc=`) is bundled
in the APK. Models are signed offline with the corresponding Ed25519 private
key. A compromised Firebase account cannot push a malicious model without
the signing key.


## 3. Data Flow: Camera to Synced Attendance Record

```
+--------+    +-------+    +--------+    +---------+    +--------+    +---------+
| Camera | -> | YuNet | -> | Align  | -> |EdgeFace | -> | Match  | -> |Liveness |
| frame  |    |detect |    |112x112 |    |embed 512|    |cosine+ |    |PAD +    |
| 30fps  |    |bbox+5 |    |affine  |    |L2 norm  |    |biohash |    |active   |
+--------+    +-------+    +--------+    +---------+    +--------+    +---------+
                                                                          |
                                                                    PASS / FAIL
                                                                          |
                                                                          v
+----------+    +-----------+    +----------+    +----------+    +------------------+
| GPS fix  | -> | Create    | -> | SQLite   | -> | Sync     | -> | PostgreSQL       |
| lat/lon/ |    | punch     |    | punch_   |    | worker   |    | ON CONFLICT      |
| accuracy |    | event row |    | events   |    | batch    |    | DO NOTHING       |
+----------+    +-----------+    +----------+    +----------+    +------------------+
                                                     |                   |
                                                     v                   v
                                               exp backoff         server_ack
                                               + jitter            SHA256 hash
                                               on failure          of event IDs
```

**Latency budget (target):**

| Stage | Target | Notes |
|-------|--------|-------|
| YuNet detection | < 15 ms | 160x120, NNAPI delegate |
| EdgeFace embedding | < 30 ms | 112x112, quantized |
| Cosine + BioHash | < 5 ms | 512-d vector, in-memory |
| MiniFASNet PAD | < 25 ms | Two models fused |
| Active challenge | 2-6 s | User interaction time |
| Total (to match) | < 100 ms | Excluding active challenge |


## 4. Security Layers

| # | Layer | Implementation | Standard |
|---|-------|---------------|----------|
| 1 | BioHashing | 512x512 Gram-Schmidt projection -> sign-quantize -> 512-bit hash. Salt per user. Original embedding irrecoverable. | ISO/IEC 24745 |
| 2 | Encrypted DB | SQLCipher AES-256-CBC on SQLite. Key from libsodium CSPRNG. | -- |
| 3 | Hardware key store | react-native-keychain -> Android Keystore (TEE/StrongBox). Master key never in JS-readable plaintext on disk. | FIPS 140-2 L1+ |
| 4 | Device attestation | Google Play Integrity API. `MEETS_DEVICE_INTEGRITY` label required in production. Fail-closed when `INTEGRITY_REQUIRED=true`. | -- |
| 5 | Signed OTA models | Ed25519 detached signatures via libsodium. Public key bundled in APK. | -- |
| 6 | JWT auth | HS256, 15-min device / 12h admin-worker expiry, 30s leeway. Role-based access (admin/worker/device). | RFC 7519 |
| 7 | Rate limiting | slowapi per-IP on auth endpoints. 256 KB body cap. | -- |
| 8 | Production lockdown | Startup validator refuses boot if JWT_SECRET, CORS, or AADHAR_PEPPER are at insecure defaults. | -- |


## 5. Deployment Topology

```
+---------------------+          +---------------------+
|  Android Device     |          |  NHAI HQ / Cloud    |
|                     |   HTTPS  |                     |
|  React Native App   | -------> |  FastAPI (uvicorn)  |
|  SQLite + SQLCipher |          |  PostgreSQL         |
|  TFLite models      |          |  Prometheus         |
|  Android Keystore   |          |  Grafana            |
+---------------------+          +---------------------+
         |                                ^
         v                                |
+---------------------+          +---------------------+
| Firebase            |          | Docker Compose      |
| Remote Config       |          |  app + db + grafana |
| Storage (models)    |          |  + prometheus       |
+---------------------+          +---------------------+
```

All biometric processing is on-device. The backend only receives:
- Punch events (timestamp, GPS, match score, liveness flag)
- No face images, no embeddings, no raw biometric data

This is a privacy-by-design architecture compliant with DPDPA 2023
principles of data minimization and purpose limitation.

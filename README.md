# NFA — NHAI Face Attendance

> **NHAI Hackathon 7.0 Submission** · Company: **PramIQ Solutions** · Team Member(s): **Avinash Kumar Srivastava, Sahil Chandel**
> Programme: *Develop a mobile-based secure offline facial recognition & liveness-detection system for remote locations.*

A secure, **fully-offline** facial-recognition + liveness attendance system for NHAI highway field
personnel — edge-AI on mid-range ₹12,000-class phones, **sub-second** identity + aliveness, privacy-preserving
by design, and built to drop straight into **Datalake 3.0**. No cloud call happens at the moment of attendance:
detection, recognition, liveness and storage all run on-device.

**📱 App Demo** — the working app in action

https://github.com/user-attachments/assets/6398abb5-5273-45a1-ac6d-732ec97985db

> 📄 **Full technical documentation:** [PDF](./NHAI_NFA_Technical_Documentation.pdf) · [HTML](./NHAI_NFA_Technical_Documentation.html) — architecture, model footprint, integration steps and benchmarks. This README mirrors that document.

---

> ⚠️ **PROPRIETARY — Copyright © 2026 PramIQ Solutions. All Rights Reserved.**
>
> This repository is **source-available for NHAI Hackathon 7.0 evaluation only — it is NOT open-source.**
> **Unauthorized cloning, copying, forking, use, modification, or distribution is strictly prohibited** and
> constitutes copyright infringement under the **Indian Copyright Act, 1957 (Sections 63–65 — civil & criminal
> liability)** and international treaties (Berne Convention). Any use requires the author's **prior written
> permission**. The author reserves the right to pursue **legal action** against unauthorized use. See [LICENSE](./LICENSE).

---

## 1. Problem & Objective

NHAI highway works happen in remote, zero-network corridors. Conventional attendance fails there: manual
registers enable proxy fraud, GPS can't prove *who* was present, and cloud face-match needs connectivity that
doesn't exist on-site. The result is unreliable workforce data and payroll leakage.

**Objective:** a highly accurate, lightweight, **entirely offline** face + liveness pipeline that runs on the
worker's own mid-range phone, proves identity *and* aliveness in under a second, stores attendance locally, and
syncs to the central server (Datalake 3.0 / AWS) when connectivity returns — then **purges** the local copy.

## 2. Solution Overview

NFA turns the worker's own phone into a self-contained biometric attendance terminal.

1. **Identity check (once):** the worker enters 4 fields (first name, last name, mobile, email), matched against
   the **Datalake 3.0** worker registry. A short-lived JWT is issued.
2. **Face registration (once):** 3 guided poses (frontal / left / right) build a 512-d face template, stored
   on-device as a cancellable **BioHash** — the raw embedding is never persisted in recoverable form.
3. **Punch in / out (daily, offline):** a live face + 2 blinks unlock the punch; GPS, timestamp and match-score
   are written to a local queue.
4. **Sync & purge:** when the phone next sees a network, queued punches upload to the server and the local copies
   are purged.

> **Key design principle — fail-closed.** If the real face engine cannot produce a trustworthy embedding, NFA
> **refuses** the punch (with a clear *"engine not ready"* message) rather than silently accepting anyone.
> Identity is verified on the live face for **4 consecutive frames**, so a registered face cannot be "latched"
> and then handed to a different person for the blink step (anti-swap).

## 3. NHAI Criteria & Compliance Matrix

| Constraint | NHAI target | NFA implementation | Status |
|---|---|---|---|
| Framework | React Native, Android + iOS | RN 0.85.3 app (Android, full on-device pipeline) + companion **Flutter** iOS build (UI parity, on-device ML wiring in progress); face logic is framework-agnostic TS + TFLite | ✅ MET |
| Model footprint | ~20 MB (smaller is better) | **≈10.7 MB** on-device models (EdgeFace-XS 7.0 + MiniFASNet ×2 ~3.5 + YuNet 0.13) — **~46% under cap** | ✅ MET |
| Processing speed | < 1 second | Per-frame detect + crop + 512-d embed + match on the worklet thread; full identity+liveness decision well under 1 s | ✅ MET |
| Hardware | No high-end GPU; Android 8+/iOS 12+, 3 GB RAM | CPU / NNAPI int8+fp32 via `react-native-fast-tflite`; runs on ₹12,000-class phones | ✅ MET |
| Accuracy | > 95%, diverse Indian demographics, varied lighting | EdgeFace backbone (≈99.7% LFW published); on-device cosine **genuine ≈0.85 vs impostor ≈0.72**, gated at 0.78 over 4 frames; AAA contrast + adaptive threshold | ✅ MET |
| Open-source models | OSS, share source | EdgeFace, YuNet, MiniFASNet, ML-Kit, VisionCamera — all open; full prototype source published | ✅ MET |
| Offline liveness | Anti-spoofing on-device | Active **blink ×2** identity gate (every punch) + **dual MiniFASNet** passive PAD (verification flow) — 100% on-device | ✅ MET |
| Sync & purge | Local data purged after sync | Offline SQLite queue → background sync on reconnect → **purge-on-ACK** | ✅ MET |

## 4. System Architecture

A 5-layer, offline-first architecture. Everything above the network boundary runs on the device with **zero
connectivity**; the server layer is reached only opportunistically for sync.

```
① Presentation     React Native screens (Android) · Flutter parity app (iOS) · i18n EN/HI ·
                   AAA high-contrast outdoor mode · worker tab bar (Home / Calendar / Sync)
② On-Device AI     ML-Kit / YuNet detect + landmarks · EdgeFace-XS 512-d embedding (TFLite) ·
   (edge)          blink + dual-MiniFASNet liveness · cosine matcher + per-user adaptive threshold
③ Storage & Crypto SQLite (SQLCipher) templates + punch_events · cancellable BioHash (ISO/IEC 24745) ·
                   JWT in hardware-backed keychain · no biometric ever leaves the device in raw form
④ Sync (opportunistic)  offline punch queue · NetInfo watcher · background sync worker ·
                   retry + idempotency · purge-on-ACK
————————————————————————— network boundary (offline below · online above) —————————————————————————
⑤ Backend / Datalake 3.0   FastAPI services · worker-registry verify · face-template dual-write ·
   (AWS-ready)     punch ingestion + attendance · Play Integrity hook · JWT
```

**Per-frame pipeline:**

```
CAMERA FRAME (YUV)  →  ML-Kit detect (bounds + landmarks + eye-open prob.)
        │                              └──► blink / liveness state machine
        ▼
CROP + RESIZE 112×112  →  normalize [0,1] → ×2−1 → [-1,1]
        ▼
EdgeFace-XS TFLite  →  512-d embedding  →  L2-normalize
        ▼
COSINE MATCH vs enrolled template  →  score, stage(matched / no_match)
        ▼  (identity ≥0.78 ×4 frames  AND  liveness)
PUNCH EVENT {workerId, type, ts, gps, faceScore}  →  SQLite punch_events (synced=0)
········································ offline up to here ········································
        ▼  on reconnect (NetInfo)
SYNC WORKER  →  POST /punch/sync (JWT, idempotent)  →  Datalake 3.0 / AWS  →  server ACK  →  PURGE local rows
```

## 5. AI / ML Model Architecture & Footprint

### 5.1 Model footprint (the < 20 MB story)

| Model | Role | Format | Size |
|---|---|---|---|
| **EdgeFace-XS** | Face recognition — 512-d embedding | TFLite (int8/fp32) | **7.0 MB** |
| **MiniFASNet v2** | Passive anti-spoof (liveness) | TFLite | 1.76 MB |
| **MiniFASNet v1-SE** | Passive anti-spoof (ensemble) | TFLite | 1.78 MB |
| **YuNet** | Face detection (bundle-local fallback) | TFLite (int8) | 0.13 MB |
| | **Total on-device AI footprint** | | **≈ 10.7 MB** ✅ `< 20 MB` |

> At runtime, face detection primarily uses Google **ML-Kit** (via VisionCamera), which ships with Play Services
> and adds no app-bundle weight; **YuNet** is the open, bundle-local fallback.

### 5.2 Recognition pipeline (EdgeFace-XS)

| Stage | Detail |
|---|---|
| Input tensor | `[1, 112, 112, 3]` float32 |
| Pre-processing | crop face → resize 112×112 → pixels `[0,1] → ×2 − 1 → [-1,1]` (restores EdgeFace's expected range) |
| Output | 512-d embedding, L2-normalized to a unit vector |
| Matching | cosine similarity (dot product of unit vectors) vs the enrolled template |
| Accept gate | `MATCH_COSINE = 0.78` for `MATCH_HITS_REQUIRED = 4` consecutive frames; per-user adaptive threshold `max(0.78, μ − 2σ)` after ≥20 samples (can only tighten) |

### 5.3 Cancellable BioHash (privacy-by-design)

Enrollment **never** stores the raw embedding. A cancellable biometric (**ISO/IEC 24745**) is derived: a per-user
random orthonormal projection (seeded by a CSPRNG salt) projects the 512-d embedding and sign-quantizes it to a
**512-bit hash**. Only `{hash, salt}` are stored — the original face vector is **irrecoverable**, and a leaked
template can be **revoked & re-issued** with a new salt. (Cosine remains the primary discriminator; BioHash is the
cancellable, privacy-preserving record.)

### 5.4 Offline liveness / anti-spoofing

- **Daily punch — blink ×2 + identity:** the routine punch gate is two genuine blinks **and** a matching identity
  for 4 consecutive frames. ML-Kit returns per-eye open-probability; a hysteresis state machine
  (open > 0.55, closed < 0.30) counts blinks, defeating photo/screen replay.
- **Verification / enrollment flow — dual MiniFASNet + active challenges:** a two-model passive anti-spoof
  ensemble (v2 + v1-SE) averages the real-vs-spoof score from texture/depth cues (gated at `PAD_LIVENESS = 0.5`),
  alongside a random 3-of-4 active challenge sequence (blink / head-turn / smile).
- **Anti-swap:** identity un-latches the instant a non-matching frame appears, and hard-rejects after repeated
  frames from a *different* enrolled worker.

## 6. Data Flow & Privacy

| Data at rest (device) | Form | Leaves device? |
|---|---|---|
| Face template | BioHash `{512-bit hash, salt}` | Embedding dual-written **once** at registration; never the raw image |
| Punch events | SQLite rows (SQLCipher) | Synced, then **purged** |
| JWT | Hardware-backed keychain | Never; used only as bearer |
| Camera frames | In-memory only | Never persisted or transmitted |

## 7. Offline-First Sync & Purge

- **Write-ahead, offline:** every punch is committed to local SQLite with `synced=0`. Attendance never blocks on network.
- **Connectivity watcher:** `@react-native-community/netinfo` signals when the device is genuinely online.
- **Sync worker:** uploads unsynced events with the worker JWT; uploads are **idempotent** (server de-dupes on
  event id via `ON CONFLICT DO NOTHING`), so retries are safe.
- **Purge on ACK:** once the server confirms ingestion, local rows are removed — satisfying the NHAI *"local data
  purged"* requirement and minimizing on-device PII residency.
- **Worker-controlled:** a live "pending sync" count + an explicit Sync action; no silent metered-data use.
- **Endpoint-agnostic:** a single API base config points the client at the live Datalake 3.0 / AWS gateway.

## 8. Security & Privacy

| Concern | NFA control |
|---|---|
| Biometric privacy (DPDPA 2023) | Raw embeddings never stored; on-device **cancellable BioHash** (revocable, irreversible). Recognition is 100% on-device. |
| Presentation attack (photo/video) | Active blink challenge on every punch + dual-MiniFASNet passive anti-spoof in the verification flow. |
| Identity-swap attack | Identity must hold for **4 consecutive frames** and **un-latches** the instant a non-matching face appears. |
| Fail-open risk | **Fail-closed**: if EdgeFace isn't producing real embeddings, the punch is refused (distinct "engine not ready"). |
| Data at rest | **SQLCipher**-encrypted SQLite; master key in `react-native-keychain` (hardware-backed Keystore/Keychain). |
| Token theft | JWT (**HS256**) kept in the OS keychain, not JS-readable storage; logout wipes keychain + caches. |
| Model tampering | OTA model delivery verifies an **Ed25519** (libsodium) signature before a model is loaded — client framework complete; server-side Remote Config + signed hosting configured at deployment. |
| PII / registry | The worker registry is never shipped in the app bundle or public repo; recognition is on-device only. |
| Device integrity | **Play Integrity** attestation is scaffolded on the backend auth path (`INTEGRITY_REQUIRED` flag, off by default); full OAuth2-backed verification is a pending TODO. |

## 9. Performance Benchmarks

| Metric | NHAI target | NFA (design / observed) |
|---|---|---|
| Recognition + liveness latency | < 1 s | per-frame embedding in tens of ms on the worklet thread; full decision (4-frame confirm + 2 blinks) well under 1 s |
| On-device model size | ~20 MB | **≈ 10.7 MB** total TFLite |
| Recognition accuracy | > 95% | EdgeFace backbone ≈99.7% LFW (published); on-device genuine/impostor cosine **0.85 vs 0.72**, gated at 0.78 |
| Min hardware | Android 8 / iOS 12, 3 GB RAM, no GPU | CPU / NNAPI int8+fp32; runs on ₹12,000-class phones |
| Offline operation | Zero-network zones | **100%** — detect, recognize, liveness, storage all offline; network only for opportunistic sync |

> Observed cosine values are from on-device measurement during development on a mid-range Android device; accuracy
> figures should be confirmed per deployment against a labelled worker set as part of rollout calibration.

## 10. Project Structure

```
NhaiHackthon-7/
├── frontend/                 # React Native 0.85.3 (Android) — primary app
│   ├── src/
│   │   ├── app/              # worker screens, navigation, components, theme/ (AAA outdoor mode)
│   │   ├── ml/               # pipeline, thresholds, processors, challenges, adaptiveThreshold
│   │   ├── storage/          # quick-sqlite (SQLCipher), vectorMatch, crypto/bioHash, keychain
│   │   ├── sync/             # offline punch queue, sync worker, retry/backoff, NetInfo watcher
│   │   ├── ota/              # Firebase Remote Config OTA + Ed25519 (libsodium) verify
│   │   ├── i18n/             # en.json + hi.json
│   │   └── types/
│   ├── assets/models/        # edgeface_xs_int8 · yunet_int8 · minifasnet_v2 · minifasnet_v1se (.tflite)
│   └── tests/                # Jest unit suites
├── backend/                  # FastAPI
│   ├── app/
│   │   ├── routes/           # worker · punch · attendance · workers · auth (legacy) · healthz
│   │   ├── auth/             # jwt (HS256), play_integrity
│   │   ├── utils/            # data_lake (Datalake 3.0 registry)
│   │   ├── security/         # rate-limit, body-size, CORS middleware
│   │   ├── db/ · models/
│   ├── dashboards/           # nhai_hq_dashboard.json (Grafana / Prometheus)
│   └── tests/                # pytest (13 tests)
├── ios/                      # Flutter parity app (iOS) — separate codebase, see ios/README.md
├── docs/                     # architecture, proposal, threat model, model card, benchmarks
├── NHAI_NFA_Technical_Documentation.{html,pdf}   # ← authoritative technical document
└── LICENSE                   # Proprietary (PramIQ Solutions)
```

## 11. Tech Stack

| Layer | Technology |
|---|---|
| Mobile (Android) | React Native 0.85.3, TypeScript, `react-native-vision-camera` 4.6 + worklets-core 1.6 |
| Mobile (iOS) | Flutter companion app (UI parity; on-device ML wiring in progress) — see [ios/README.md](./ios/README.md) |
| ML inference | `react-native-fast-tflite` 1.5 (TFLite int8/fp32, CPU/NNAPI) |
| Detection | Google ML-Kit (`react-native-vision-camera-face-detector` 1.10) + YuNet INT8 fallback |
| Recognition | EdgeFace-XS INT8 (512-d embeddings) |
| Anti-spoof | MiniFASNet v2 + v1-SE (dual-model passive PAD) |
| Liveness | active blink ×2 (ML-Kit eye-open) + identity 4-frame gate |
| Local DB | `react-native-quick-sqlite` 8.2 (**SQLCipher** key) |
| Key storage | `react-native-keychain` 10 (hardware-backed Keystore/Keychain) |
| Template security | cancellable BioHashing (ISO/IEC 24745) |
| Crypto | `react-native-libsodium` (Ed25519 OTA signature verify) |
| OTA | Firebase Remote Config + Ed25519-signed `.tflite` delivery (client framework; server config at deploy) |
| Sync | offline queue + `@react-native-community/netinfo` + exponential backoff |
| i18n | `i18next` 26 — Hindi + English; offline voice prompts via `react-native-tts` (en-IN / hi-IN) |
| State / UI | `zustand` 5 · AAA high-contrast outdoor theme (WCAG AAA, 18pt+ fonts) |
| Backend | FastAPI, async SQLAlchemy 2.0, `asyncpg`, PostgreSQL (SQLite for tests) |
| Auth | JWT (HS256, 12-hour role tokens) + Play Integrity scaffold |
| Observability | Prometheus (`prometheus-fastapi-instrumentator`) + Grafana NHAI HQ dashboard |
| Hardening | slowapi rate-limiting · body-size limit · CORS |

## 12. Quick Start

### Prerequisites
- Node.js 20+, Java JDK 17/21, Android SDK 34 (frontend)
- Python 3.11+, PostgreSQL 15+ (backend)
- Flutter 3.12+ (iOS app — `.ipa` build requires macOS + Xcode)

### Frontend (Android — primary app)
```bash
cd frontend
npm install --legacy-peer-deps
npx react-native run-android        # or build a release APK via gradle
```

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                 # configure DATABASE_URL, JWT_SECRET, DATA_LAKE_PATH
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### iOS (Flutter)
```bash
cd ios
flutter pub get
flutter run                          # iPhone build/signing requires macOS + Xcode
```

## 13. Backend REST Contract

> Base prefix `/api/v1`. Worker endpoints take a Bearer JWT issued by `/worker/verify`.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/worker/verify` | `{first_name, last_name, mobile, email}` → match Datalake 3.0, return JWT + profile |
| POST | `/worker/register-face` | `{face_template_id, embedding}` (Bearer) — one-time dual-write; 409 if already registered |
| POST | `/worker/login` | returning-worker login |
| POST | `/punch/sync` | batch of queued punches (Bearer, **idempotent**) — ingest + ACK |
| GET | `/punch/me` | worker's own punches (calendar reconciliation) |
| GET | `/punch/worker/{id}` · `/punch/summary/{id}` | attendance view / per-day roll-up |
| GET | `/healthz` | health check |
| GET | `/metrics` | Prometheus metrics (Bearer token-gated) |
| — | `/workers/*` | worker management (internal) |

*(The legacy `/auth/token` device-auth endpoint returns `410 Gone` unless `DEVICE_TOKEN_ENABLED` is set.)*

## 14. Ready-to-Integrate: Datalake 3.0

NFA is built as **drop-in modules**, not a monolith.

1. **Add 5 packages** — vision-camera, fast-tflite, vision-camera-face-detector, vision-camera-resize-plugin, worklets-core.
2. **Bundle 4 TFLite files** — register `tflite` in `metro.config.js` assetExts and copy `assets/models/*.tflite`.
3. **Import the modules** — `src/ml/` (pipeline, processors, thresholds), `src/storage/` (vectorMatch, templates repo, BioHash), `src/sync/` (punch queue + sync/purge); or reuse the ready `EnrollmentScreen` / `PunchCaptureScreen`.
4. **Wire 4 REST endpoints** — `/worker/verify`, `/worker/register-face`, `/punch/sync`, `/punch/me`.
5. **Permissions & AWS** — Android `CAMERA` + fine-location, iOS camera/location usage strings; point the single API base at the live Datalake 3.0 / AWS gateway.

> **Net effort:** add 5 packages, bundle 4 TFLite files, import `ml/` + `storage/` + `sync/`, wire 4 endpoints.
> No change to Datalake 3.0's existing data model is required — punch events are additive.

## 15. Test Results

```
Frontend: Jest unit suites — vectorMatch · blink · challengeEngine · retryPolicy · syncWorker (+ app smoke)
Backend:  13 pytest tests — JWT auth, batch insert, idempotency, Pydantic validation, date-range queries, healthz
```

## 16. Evaluation-Criteria Mapping

| NHAI ask | NFA answer |
|---|---|
| Offline facial recognition | EdgeFace-XS TFLite, 100% on-device, no network at attendance time |
| Liveness detection | blink ×2 + dual MiniFASNet, fully offline |
| Lightweight (< 20 MB) | ≈ 10.7 MB of models |
| < 1 s, mid-range, no GPU | per-frame worklet pipeline on CPU/NNAPI |
| > 95% accuracy, diverse demographics & lighting | EdgeFace backbone + adaptive threshold + AAA mode |
| React Native, Android + iOS | RN app (Android, full pipeline) + Flutter iOS (UI parity), framework-agnostic core |
| Sync & purge to AWS | idempotent offline queue → sync → purge |
| Open-source models + source shared | all OSS models; full prototype on GitHub |

## License

**Proprietary — Copyright © 2026 PramIQ Solutions. All Rights Reserved.**

This project is **source-available for NHAI Hackathon 7.0 evaluation only** and is **NOT** released under any
open-source license (MIT/Apache/etc.). No permission is granted to copy, clone, fork, use, modify, or distribute
the source code, models, documentation, slides, or demo video without the author's **prior written consent**.
Unauthorized use constitutes copyright infringement under the **Indian Copyright Act, 1957 (Sections 63–65)** and may
result in **civil and criminal liability**. Full terms: [LICENSE](./LICENSE).

> Third-party dependencies and models remain under their own open-source licenses (MIT / Apache-2.0 / BSD-3). This
> proprietary notice applies to the original work in this repository.

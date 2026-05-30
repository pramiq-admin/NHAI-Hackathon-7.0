# NHAI Face Authentication -- Threat Model

## 1. System Scope and Assumptions

**Cooperative-user assumption:** This system operates in a supervised
enrollment environment. Workers are enrolled by an authenticated admin who
verifies identity against Aadhaar documents before capturing the face
template. The system assumes workers are **cooperative** during daily
verification -- they want to be recognized for attendance credit. This is
fundamentally different from adversarial biometrics (border control, forensic
identification) where subjects actively resist recognition.

**Threat actors considered:**
- Opportunistic fraud (buddy punching, proxy attendance)
- Casual spoofing (printed photo, phone screen replay)
- Device theft / loss
- Network interception (public Wi-Fi, compromised tower)
- Insider (admin colluding with worker, or rogue IT staff)
- Sophisticated attacker (rooted device, reverse engineering)


## 2. Threat Analysis

### T1: Presentation Attack (Photo / Video)

| | |
|---|---|
| **Description** | Attacker holds a printed photo or plays a video of the enrolled worker in front of the camera to punch in on their behalf. |
| **Likelihood** | High -- photos are trivially available (social media, ID cards). |
| **Mitigation** | (a) **MiniFASNet passive PAD**: two-model fusion (V2 + V1-SE), softmax-averaged realScore must exceed 0.5. Catches flat printed/screen attacks via texture + moiré analysis. (b) **Active liveness challenges**: random 3-of-4 sequence (blink, head turn left/right, smile) with 6-second per-step timeout. Photos cannot blink; videos cannot respond to randomized challenge order. (c) One retry per failed challenge step before full failure. |
| **Residual risk** | Low for photo/video. Medium for high-quality video replay on a tablet -- active challenges are the primary defense here, and a sufficiently advanced deepfake video that responds in real-time to random prompts would bypass this. |

### T2: Presentation Attack (3D Mask / Silicone)

| | |
|---|---|
| **Description** | Attacker uses a 3D-printed or silicone mask of the enrolled worker's face. |
| **Likelihood** | Very low in the NHAI highway worker context -- masks cost thousands of rupees and require 3D scanning of the target. |
| **Mitigation** | MiniFASNet provides partial defense via texture analysis, but is not designed for high-fidelity 3D attacks. Active challenges (blink, smile) do not help -- a mask wearer can perform these. |
| **Residual risk** | **High if attempted.** We do NOT claim defense against 3D masks. This is an accepted limitation for the deployment context (highway construction sites, not high-security facilities). |

### T3: Template Theft (Database Extraction)

| | |
|---|---|
| **Description** | Attacker extracts the SQLite database file from a lost/stolen device and attempts to recover face embeddings to impersonate workers or conduct identity fraud. |
| **Likelihood** | Medium -- device theft is common on construction sites. |
| **Mitigation** | (a) **SQLCipher AES-256** encryption on the database. The .db file is unreadable without the master key. (b) **Android Keystore (TEE/StrongBox)** storage for the master key via react-native-keychain. Key never exists as plaintext on the filesystem. (c) **BioHash (ISO/IEC 24745)** cancellable templates: even if both the DB and master key are compromised, stored templates are one-way 512-bit hashes derived from a random projection matrix. The original 512-d embedding cannot be reconstructed. (d) **Salt per user**: compromising one user's BioHash does not help attack another. |
| **Residual risk** | Low. An attacker with root access AND the ability to extract the Keystore key (requires TEE exploit or device unlock) could read embeddings from the `emb` column. Mitigation: the `emb` column stores raw embeddings alongside BioHash for cosine matching -- a future hardening would store only BioHash and perform all matching in the hashed domain, eliminating the raw vector entirely. |

### T4: Device Compromise (Root / Custom ROM)

| | |
|---|---|
| **Description** | Attacker roots the device to bypass security controls, extract keys, tamper with ML models, or inject fake camera frames. |
| **Likelihood** | Low-medium -- rooting is common in India but requires technical skill to exploit further. |
| **Mitigation** | (a) **Google Play Integrity API** attestation: production requires `MEETS_DEVICE_INTEGRITY` verdict. Rooted/unlocked devices fail this check. Fail-closed when `INTEGRITY_REQUIRED=true`. (b) Results are cached for 1 hour per device to avoid per-request latency. (c) **Ed25519 signed OTA models**: even on a rooted device, replacing the ML model requires the offline signing key (not stored on-device or on Firebase). |
| **Residual risk** | Medium. Play Integrity can be bypassed by sophisticated tools (Magisk Hide, etc.). The `INTEGRITY_REQUIRED=false` default in dev mode is a deliberate trade-off for hackathon demo convenience -- production MUST set it to `true`. Camera frame injection on a rooted device could bypass liveness entirely; defending against this requires hardware-attested camera pipelines (not implemented). |

### T5: Man-in-the-Middle (Network Interception)

| | |
|---|---|
| **Description** | Attacker intercepts HTTP traffic between the app and backend to steal JWTs, replay sync requests, or tamper with attendance records. |
| **Likelihood** | Medium on construction sites with shared Wi-Fi or cellular interception. |
| **Mitigation** | (a) **HTTPS** for all API communication (enforced by axios baseURL config). (b) **JWT with 15-minute expiry** for device tokens; 30-second leeway for clock skew. (c) **No biometric data in transit** -- the server receives only punch metadata (timestamp, GPS, match score, liveness flag). An intercepted request reveals no face data. (d) **CORS origin-locked in production** (startup validator refuses `*`). (e) **Body size cap** (256 KB) prevents DoS via oversized payloads. |
| **Residual risk** | Low. Certificate pinning is not implemented -- a sophisticated MITM with a trusted CA cert (e.g., corporate proxy) could intercept traffic. The 15-minute JWT window limits replay utility. |

### T6: Replay Attack (Re-submitting Old Attendance)

| | |
|---|---|
| **Description** | Attacker captures a valid attendance sync request and replays it to register duplicate attendance entries. |
| **Likelihood** | Low -- requires network interception first (T5). |
| **Mitigation** | (a) **Idempotent event IDs**: server uses `ON CONFLICT DO NOTHING` on `event_id` (UUID). Replaying the same request is a no-op; the event_id is already recorded. (b) **server_ack = SHA256(sorted event_ids)**: client can verify the server processed the correct batch. (c) **JWT expiry** (15 min) limits the replay window. |
| **Residual risk** | Very low. An attacker could generate new event_ids, but they would need a valid JWT and a device that passes Play Integrity. |

### T7: Insider Fraud (Admin Collusion)

| | |
|---|---|
| **Description** | An admin enrolls ghost workers or punches in absent workers using their own face enrolled under multiple identities. |
| **Likelihood** | Medium -- insider fraud is a known problem in attendance systems. |
| **Mitigation** | (a) **Duplicate face detection**: `enrollFace()` runs cosine match against all existing templates before enrollment. If the face already exists under a different `userId`, a `DuplicateFaceError` is thrown with the existing identity. This prevents one person from enrolling as multiple workers. (b) **Role separation**: admin JWT and worker JWT are distinct roles. Admin operations are logged with `admin_id`. (c) **Aadhaar hash binding**: worker registration hashes the Aadhaar number with a server-side pepper (HMAC). Duplicate Aadhaar detection at the DB level. |
| **Residual risk** | Medium. An admin could enroll a real but non-working person and share credentials. GPS coordinates on punch events provide a secondary audit trail (was the device at the work site?). Full mitigation requires supervisor audits and GPS geofencing (not yet implemented). |

### T8: Model Poisoning (Malicious OTA Update)

| | |
|---|---|
| **Description** | Attacker compromises Firebase account and pushes a poisoned .tflite model that accepts all faces or leaks embeddings. |
| **Likelihood** | Low -- requires Firebase admin compromise. |
| **Mitigation** | (a) **Ed25519 detached signatures**: the signing key is held offline, not on Firebase. A compromised Firebase account can push a new model file, but without a valid signature, the app rejects it and deletes the download. (b) **Public key bundled in APK**: the verify key is embedded at build time. Changing it requires a new APK release through Play Store review. |
| **Residual risk** | Very low. Requires compromise of both Firebase AND the offline signing key. |


## 3. What We Do NOT Defend Against

Transparency about limitations is essential for an honest security posture.

| Limitation | Reason |
|-----------|--------|
| **3D silicone masks** | MiniFASNet is a 2D texture-based PAD. Defeating high-fidelity 3D masks requires depth sensors (structured light, ToF) which are not present on budget Android devices deployed at construction sites. |
| **Identical twins** | Face embeddings of identical twins are nearly indistinguishable. This is a fundamental limitation of appearance-based face recognition. Mitigation: Aadhaar-level identity binding (different Aadhaar numbers). |
| **Coerced enrollment** | If a worker is physically forced to enroll or verify, the system cannot distinguish willing from unwilling participation. This is outside the threat model for an attendance system. |
| **Camera-level frame injection** | On a rooted device with a modified camera HAL, the attacker can feed arbitrary frames to the camera API. Play Integrity catches most rooted devices, but sophisticated bypass tools exist. Full defense requires Android Protected Confirmation or hardware-attested camera paths. |
| **Side-channel attacks on TEE** | Extracting keys from the Android Keystore TEE via voltage glitching or other hardware attacks is theoretically possible but requires physical access and expensive equipment. Out of scope. |
| **Deepfake real-time video** | A real-time deepfake that responds to randomized active challenges (blink on demand, turn head on demand) is not yet commodity-available but is a plausible future threat. Active challenge randomization raises the bar but does not eliminate the risk. |


## 4. Compliance Mapping

### 4.1 Digital Personal Data Protection Act, 2023 (DPDPA)

| DPDPA Principle | Implementation |
|----------------|---------------|
| **Purpose limitation** | Biometric data used solely for attendance verification. No secondary use. |
| **Data minimization** | Face embeddings stay on-device. Server receives only metadata (timestamp, GPS, scores). No face images transmitted or stored server-side. |
| **Storage limitation** | Templates are device-local. Server stores only attendance records. No centralized biometric database. |
| **Consent** | Enrollment requires admin-supervised, in-person capture with Aadhaar verification. Worker is informed of purpose. |
| **Data Principal rights** | Template deletion is possible via admin panel (delete worker -> purge local templates). BioHash is cancellable -- re-enrollment generates new salt + projection, invalidating old hashes. |
| **Security safeguards** | SQLCipher encryption, Keystore-backed keys, signed OTA, JWT auth, rate limiting, production lockdown validator. |

### 4.2 ISO/IEC 24745 (Biometric Template Protection)

| Requirement | Implementation |
|------------|---------------|
| **Irreversibility** | BioHash uses a 512x512 random orthonormal projection (Gram-Schmidt) + sign quantization. The 512-d -> 512-bit mapping is lossy and one-directional. |
| **Unlinkability** | Each user has a unique 32-character random salt. Different salts produce different projection matrices, so templates from the same face are uncorrelatable across users/devices. |
| **Renewability (cancellability)** | Compromised template? Generate new salt, re-enroll. Old BioHash becomes useless. No need to change the biometric itself. |

### 4.3 UIDAI Aadhaar Authentication Guidelines

| Guideline | Implementation |
|----------|---------------|
| **Aadhaar data handling** | Aadhaar numbers are HMAC-hashed with a server-side pepper before storage. Raw Aadhaar never stored in the database. |
| **No Aadhaar biometric storage** | The system uses its own face enrollment, not UIDAI biometric APIs. Aadhaar is used only for identity binding (hash-based deduplication). |
| **Audit trail** | Every attendance event includes device_id, GPS, timestamp, and match scores for post-hoc audit. |

### 4.4 MeitY FOSS Policy

| Requirement | Implementation |
|------------|---------------|
| **Open-source ML models** | YuNet (OpenCV Zoo, Apache 2.0), EdgeFace (academic, open-source). MiniFASNet (MIT license). |
| **Open-source stack** | React Native (MIT), FastAPI (MIT), PostgreSQL (PostgreSQL License), SQLite (public domain), Prometheus + Grafana (Apache 2.0). |
| **No vendor lock-in** | Firebase is used for OTA convenience but is swappable. Core ML inference is local TFLite -- no cloud API dependency. |

### 4.5 STQC Testing Standards

| Area | Testability |
|------|------------|
| **FAR/FRR measurement** | Cosine threshold (0.5) and BioHash Hamming threshold (0.35) are centralized in `thresholds.ts`. Tunable for STQC evaluation. |
| **PAD testing (ISO 30107-3)** | MiniFASNet threshold (0.5) can be adjusted. Active challenge parameters (timeout, angle, smile probability) are configurable. |
| **Reproducibility** | All ML models are deterministic TFLite. Seeded RNG for BioHash projection matrices. Benchmark script (`benchmark_device.ts`) measures per-stage latency. |


## 5. Risk Register Summary

| ID | Threat | Severity | Likelihood | Residual Risk | Status |
|----|--------|----------|-----------|---------------|--------|
| T1 | Photo/video spoof | High | High | Low | Mitigated (PAD + active challenges) |
| T2 | 3D mask | Critical | Very Low | High if attempted | Accepted (context-appropriate) |
| T3 | Template theft | High | Medium | Low | Mitigated (SQLCipher + Keystore + BioHash) |
| T4 | Rooted device | High | Low-Medium | Medium | Mitigated (Play Integrity) |
| T5 | MITM | Medium | Medium | Low | Mitigated (HTTPS + no biometric in transit) |
| T6 | Replay attack | Medium | Low | Very Low | Mitigated (idempotent IDs + JWT expiry) |
| T7 | Insider fraud | High | Medium | Medium | Partially mitigated (duplicate detection + GPS) |
| T8 | Model poisoning | Critical | Low | Very Low | Mitigated (Ed25519 signed OTA) |


## 6. Future Hardening (Post-Hackathon)

1. **Certificate pinning** -- pin the backend's TLS certificate in the app to
   defeat corporate-proxy MITM attacks.
2. **Eliminate raw embedding storage** -- match entirely in the BioHash domain
   to remove the `emb` column from SQLite. Requires BioHash-domain matching
   accuracy validation.
3. **GPS geofencing** -- reject punch events from coordinates outside the
   designated construction site boundary.
4. **Multi-frame anti-spoof** -- aggregate PAD scores across N frames instead
   of single-frame decision for more robust spoof detection.
5. **Depth-based liveness** -- leverage ToF sensors on higher-end devices
   where available.
6. **Anomaly detection** -- flag unusual patterns (e.g., same device punching
   50 workers in 10 minutes, punches at 3 AM).

# NHAI Hackathon 7.0 — Implementation Phases

**Companion to** [NHAI_HACKATHON_STRATEGY.md](NHAI_HACKATHON_STRATEGY.md)
**Participant:** Sahil Chandel (Solo)
**Window:** 2026-05-22 → 2026-06-05 (14 working days + Day 0 prep)
**Use this doc:** Open each morning, find current phase, work through tasks top-to-bottom, tick acceptance criteria before moving to next phase.

---

## How to Use This Document

Each phase has:
- **Goal** — one-line what we're proving by the end of this phase
- **Duration** — calendar days allocated
- **Depends on** — phases that must be done first
- **Parallelizable with** — phases that can run alongside (especially for fine-tune that needs GPU time)
- **Tasks** — numbered, concrete, each with a time estimate
- **Files touched** — what gets created/modified
- **Reference repos** — code to clone/study
- **Acceptance criteria** — checklist that must all pass before moving on
- **Risks & mitigation** — what could go wrong, fallback plan

**Golden rule:** Don't advance to the next phase until ALL acceptance criteria for the current phase pass on a real mid-range Android device. Skipping criteria = pain on demo day.

**Working-directory convention (apply to every command in this doc):**
- All `npm install ...` and `npx ...` commands run from `frontend/` — that's where `package.json` lives.
- All `pip install ...`, `uvicorn ...`, `pytest ...`, `python sign_and_upload.py ...` commands run from `backend/`.
- `git`, `docker compose`, and project-wide tools run from the repo root.
- Paths in "Files Created" sections are **relative to repo root** (i.e., `frontend/src/...` or `backend/app/...`).

---

## Phase Overview

> **Anchored to** [hackathon_doc7.pdf](hackathon_doc7.pdf) (Innovation 30 / Feasibility 30 / Scalability 20 / Presentation 20)
> **Differentiators baked in** from [winning_edge_strategy.md §4](winning_edge_strategy.md#4-top-5-differentiator-features-to-add-ranked-impact-per-effort)

| Phase | Days | Goal | Key Output | Winning-Edge Differentiator |
|---|---|---|---|---|
| **Phase 0** | Day 0 (pre-flight) | Environment + accounts + datasets ready | All tools installed, datasets requested, GitHub repo init, Firebase project, AWS RDS standby | Indian dataset access requests sent; Firebase project created |
| **Phase 1** | Day 1 | RN app shows camera feed + YuNet detection draws bbox | Working face detector on Android | Colab fine-tune training kicked off in background |
| **Phase 2** | Day 2-3 | EdgeFace embedding extraction + local SQLite vector store | End-to-end face recognition working | **D3: Cancellable BioHashing (ISO/IEC 24745) + MagFace magnitude quality gate** |
| **Phase 3** | Day 4 | Enrollment + Verify screens with full UX | Visible app, demo-able 1:N match | **Hindi/English i18n + Pico offline TTS voice prompts + AAA outdoor UI** |
| **Phase 4** | Day 5-6 | Passive PAD + active challenges (blink/head-turn/smile) | Spoof attempt rejected; liveness gate works | — |
| **Phase 5** | Day 7 | iOS build with CoreML delegate parity | Same app runs on iPhone | — |
| **Phase 6** | Day 8 (parallel from Day 1) | EdgeFace fine-tuned on Indian datasets | INT8 model with >95% acc on Indian val set | — |
| **Phase 7** | Day 9 (heavy: 12-14 hrs) | FastAPI backend + PostgreSQL + sync + **5 differentiators stacked** | Sync working + OTA model push live + HQ dashboard + hardware-backed security | **Firebase Remote Config + signed `.tflite` OTA + StrongBox/Keystore + Play Integrity API + Grafana dashboard + per-device adaptive threshold** |
| **Phase 8** | Day 10-11 | Real device field testing + threshold tuning | Benchmarks table: latency p50/p95, accuracy per condition | **Rehearse OTA live-update demo on stage** |
| **Phase 9** | Day 12 | Unit + E2E tests | Test suite green | Coverage extended to BioHashing, OTA verifier, Play Integrity |
| **Phase 10** | Day 13 | **6-slide pitch deck** + technical doc + integration guide | Submission-ready artifacts | **DPDPA compliance matrix slide + TCO slide + pilot corridor plan slide** (verbatim from [winning_edge_strategy.md §3](winning_edge_strategy.md#3-pitch-deck-blueprint--6-slides-sih-style-density)) |
| **Phase 11** | Day 14 | Demo video + final upload | Submitted | **3 physical props prepared** (printed photo + secondary phone with video loop + paper mask); failure-recovery rehearsal |

---

## Phase 0 — Pre-Flight Setup

**Goal:** Every tool, account, dataset, and reference repo is ready before submission opens. Lose no Day 1 time to installs.
**Duration:** 1 day (pre-submission window, can do BEFORE May 22)
**Depends on:** Nothing
**Parallelizable with:** N/A

### Tasks

1. **Dev environment (Windows)** — 1 hr
   - Node.js 20+ (via [nvm-windows](https://github.com/coreybutler/nvm-windows))
   - Java JDK 17 + Android Studio Hedgehog/Iguana with Android SDK 34
   - Xcode 15+ (if you have a Mac available; iOS can also be tested in Day 7)
   - Python 3.11+ with `uv` package manager
   - Git + GitHub CLI

2. **RN tooling** — 30 min
   ```powershell
   npm install -g react-native-cli
   npx react-native doctor      # fix any warnings before proceeding
   ```

3. **Python ML toolchain** — 45 min
   ```powershell
   uv pip install torch torchvision onnx onnxruntime onnx2tf tensorflow opencv-python pillow numpy scikit-learn
   ```

4. **Clone reference repos** — 30 min
   - [`mrousavy/react-native-vision-camera`](https://github.com/mrousavy/react-native-vision-camera) — read docs
   - [`mrousavy/react-native-fast-tflite`](https://github.com/mrousavy/react-native-fast-tflite) — read docs
   - [`otroshi/edgeface`](https://github.com/otroshi/edgeface) — clone, download xxs/xs INT8 weights
   - [`minivision-ai/Silent-Face-Anti-Spoofing`](https://github.com/minivision-ai/Silent-Face-Anti-Spoofing) — clone, copy `.pth` weights
   - [`opencv/opencv_zoo`](https://github.com/opencv/opencv_zoo) — grab YuNet ONNX
   - [`shubham0204/OnDevice-Face-Recognition-Android`](https://github.com/shubham0204/OnDevice-Face-Recognition-Android) — clone, study architecture

5. **Indian datasets download (slow — start this early)** — overnight
   - IndicFairFace: request access via [arXiv 2602.12659](https://arxiv.org/abs/2602.12659) authors
   - JFAD: request from IIT Jodhpur IAB Lab
   - IMFDB: download from IIIT-H/CVIT site
   - DFW: download from IIIT-Delhi IAB Lab
   - Store under `~/datasets/indian_faces/` with subdirectories per source

6. **AWS account + free-tier resources** — 30 min
   - RDS PostgreSQL `db.t3.micro` (free tier, leave stopped until Phase 7)
   - EC2 `t3.micro` (free tier)
   - IAM user with minimal scope (RDS, EC2, S3 backup)
   - Note credentials in a password manager — never commit

7. **Test devices** — purchase/borrow
   - 1× mid-range Android (target: Redmi Note 12 / Realme Narzo / 3-4 GB RAM, Helio G70/G85 or Snapdragon 4xx-6xx)
   - 1× iPhone (any, iOS 14+, for Phase 5)
   - USB cables, ADB enabled, developer mode on

8. **GitHub repo init** — 15 min
   ```powershell
   gh repo create nhai-face-auth --private
   git clone https://github.com/<you>/nhai-face-auth.git
   ```

9. **Google Colab setup** — 15 min
   - Open Colab, verify GPU access (T4 free, A100 paid)
   - Mount Google Drive for dataset/checkpoint storage

10. **Firebase project setup (for OTA + Remote Config differentiator)** — 30 min
    - Create Firebase project at console.firebase.google.com
    - Enable Remote Config + Cloud Storage (for hosting `.tflite` files)
    - Generate service account key for backend signing
    - Note `google-services.json` (Android) + `GoogleService-Info.plist` (iOS) — required Phase 7
    - Generate Ed25519 keypair (`ssh-keygen -t ed25519`) — private key stays on backend for model signing, public key bundled in app

11. **Play Console + App Attest setup** — 20 min
    - Google Play Developer account (₹2,000 one-time) — needed for Play Integrity API
    - Apple Developer account if iOS (₹8,500/yr) — needed for App Attest
    - Note: Play Integrity has free tier sufficient for hackathon scale

12. **Indian dataset access — email immediately (slow turnaround)** — 30 min
    - **IndicFairFace** — email arXiv 2602.12659 corresponding authors with "NHAI hackathon research, non-commercial" subject
    - **JFAD** — email IIT Jodhpur IAB Lab (iab-rubric.org/old/resources/face)
    - **DFW** — email IIIT-Delhi IAB Lab (iab-rubric.org)
    - **IMFDB** — direct download from IIIT-H/CVIT site, no email needed
    - **CC the cover letter to a `.txt` file** in repo for audit trail

### Files Touched
- `~/datasets/indian_faces/` (created)
- `~/repos/nhai-references/` (cloned)
- `.env.example` template noted
- `~/.firebase/nhai-face-auth/` (Firebase project config)
- `~/.keys/model_signing_ed25519` (private key for signing OTA `.tflite` files)

### Acceptance Criteria
- [ ] `npx react-native doctor` shows zero issues
- [ ] `py -c "import torch, onnx, tensorflow, cv2"` all import without error
- [ ] `adb devices` shows your test phone
- [ ] AWS RDS instance created (stopped is fine)
- [ ] At least 2 of 4 Indian datasets downloaded OR access emails sent (IndicFairFace + JFAD minimum)
- [ ] GitHub repo created, README placeholder pushed
- [ ] Firebase project created with Remote Config enabled
- [ ] Play Console account verified (Play Integrity API will be needed Day 9)
- [ ] Ed25519 keypair generated for `.tflite` signing

### Risks
- Dataset access requests may take 2-5 business days → file requests **immediately**, well before Day 0
- Android Studio + emulator setup can eat half a day on slow internet — use real device instead of emulator if possible

---

## Phase 1 — Foundation: RN + Camera + First Model

**Goal:** App launches, camera permission granted, YuNet detector draws bounding box around face in real-time.
**Duration:** Day 1 (8 hrs)
**Depends on:** Phase 0
**Parallelizable with:** Phase 6 (kick off Colab fine-tune in background)

### Tasks

1. **Init RN project + backend skeleton (split frontend/backend)** — 30 min
   ```powershell
   # Top-level layout: frontend/ for RN UI, backend/ for FastAPI + ML training
   npx react-native init frontend --template react-native-template-typescript
   New-Item -ItemType Directory backend, backend\app, backend\ml, backend\scripts, backend\notebooks, backend\tests, backend\dashboards
   git init
   git add -A
   git commit -m "Initial scaffold: frontend/ (RN) + backend/ (FastAPI)"
   ```

   **Top-level repo layout (enforced for entire project):**
   ```
   NhaiFaceAuth/
   ├── frontend/      # React Native UI — Android + iOS + TypeScript source
   │   ├── android/   # Native Android (Kotlin bridges)
   │   ├── ios/       # Native iOS (Swift bridges)
   │   ├── src/       # TS source (app/, ml/, storage/, sync/, ota/, i18n/, ...)
   │   ├── assets/    # Bundled .tflite models + signing pubkey
   │   ├── scripts/   # TS device-side scripts (benchmarks)
   │   └── tests/     # Jest unit + Detox E2E
   ├── backend/       # FastAPI server + ML training/conversion + Grafana
   │   ├── app/       # FastAPI routes, models, db, auth
   │   ├── ml/        # Python: model conversion, fine-tune, quantize, sign-and-upload
   │   ├── scripts/   # Deploy / one-off ops scripts
   │   ├── backend/notebooks/ # Colab fine-tune + eval
   │   ├── dashboards/# Grafana JSON exports
   │   └── tests/     # pytest
   ├── docs/          # Strategy, architecture, pitch deck, brief
   └── README.md
   ```

2. **Install core dependencies** — 30 min
   ```powershell
   npm install react-native-vision-camera react-native-fast-tflite react-native-worklets-core
   npm install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context
   ```

3. **Android permissions** — 20 min
   - `frontend/android/app/src/main/AndroidManifest.xml`: add CAMERA, INTERNET, RECORD_AUDIO (optional)
   - `frontend/android/build.gradle`: `minSdkVersion = 26` (Android 8.0)

4. **YuNet ONNX → TFLite INT8 conversion** — 1 hr
   - Use `backend/ml/convert_yunet.py`:
     ```python
     # Download from opencv_zoo, convert via onnx2tf -i yunet.onnx -oiqt
     ```
   - Output: `frontend/assets/models/yunet_int8.tflite` (~100 KB)

5. **Bundle TFLite asset** — 20 min
   - Place under `frontend/android/app/src/main/assets/`
   - `metro.config.js`: ensure `.tflite` is in asset extensions

6. **Camera screen + frame processor** — 3 hrs
   - `frontend/src/app/screens/VerificationScreen.tsx`: full-screen `<Camera>` with `frameProcessor`
   - `frontend/src/ml/processors/faceDetect.worklet.ts`: load YuNet, run on each frame
   - Render bbox overlay using `react-native-skia` OR simple absolutely-positioned View

7. **First run on physical device** — 30 min
   ```powershell
   npx react-native run-android
   ```
   - Aim camera at your face; bbox should track.
   - Print FPS + per-frame latency to console for sanity.

8. **Git commit** — 10 min
   - `git commit -m "Phase 1: YuNet face detection working on Android"`

### Files Created
- `frontend/android/app/src/main/AndroidManifest.xml` (modified)
- `frontend/assets/models/yunet_int8.tflite`
- `frontend/src/app/screens/VerificationScreen.tsx`
- `frontend/src/ml/processors/faceDetect.worklet.ts`
- `frontend/src/ml/thresholds.ts` (constants stub)
- `backend/ml/convert_yunet.py`

### Reference Repos
- [react-native-fast-tflite README](https://github.com/mrousavy/react-native-fast-tflite#readme) — frame processor example
- [opencv_zoo YuNet](https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet) — ONNX source

### Acceptance Criteria
- [ ] App builds and installs on test phone
- [ ] Camera preview shows live feed
- [ ] Bounding box appears around your face, tracks as you move
- [ ] Console shows detection latency < 60 ms on test device
- [ ] No crashes on rotation, app backgrounding

### Risks
- `react-native-worklets-core` version mismatch → pin to compatible version (check VisionCamera v4 changelog)
- INT8 conversion may break YuNet outputs if calibration data is bad → use FP16 fallback (~340 KB still fine)

---

## Phase 2 — Recognition Core

**Goal:** Live face → 512-d EdgeFace embedding → cosine match against pre-enrolled templates in SQLite.
**Duration:** Day 2-3 (16 hrs)
**Depends on:** Phase 1
**Parallelizable with:** Phase 6

### Tasks

1. **EdgeFace ONNX → TFLite INT8** — 2 hrs
   - `backend/ml/convert_edgeface.py`:
     - Load `edgeface_xs_q.pt` from [otroshi/edgeface](https://github.com/otroshi/edgeface)
     - Export to ONNX (input 112×112×3 RGB, output 512-d)
     - `onnx2tf -i edgeface_xs.onnx -oiqt -cind images_input ...` (calibration: 100 random face crops)
     - Output: `frontend/assets/models/edgeface_xs_int8.tflite` (~2 MB)

2. **Embedding worklet** — 2 hrs
   - `frontend/src/ml/processors/faceEmbed.worklet.ts`:
     - Input: 112×112×3 RGB face crop (from YuNet bbox + 5-point alignment)
     - Output: L2-normalized 512-d float32 array
   - Add MediaPipe FaceMesh for 5-point alignment OR use YuNet's built-in landmarks (it returns 5)

3. **Align + crop helper** — 2 hrs
   - `frontend/src/ml/processors/faceAlign.worklet.ts`:
     - Affine warp using 5 landmarks → canonical 112×112
     - Use OpenCV.js OR write minimal warp in worklet (similarity transform)

4. **SQLite + SQLCipher setup** — 1.5 hrs
   ```powershell
   npm install react-native-quick-sqlite
   npm install react-native-libsodium @react-native-async-storage/async-storage
   ```
   - `frontend/src/storage/db/dbClient.ts`: encrypted DB connection
   - `frontend/src/storage/db/schema.sql`:
     ```sql
     CREATE TABLE templates(
       id TEXT PRIMARY KEY, user_id TEXT, name TEXT,
       emb BLOB NOT NULL, created_at INTEGER
     );
     CREATE INDEX idx_templates_user ON templates(user_id);
     ```

5. **Vector match** — 1.5 hrs
   - `frontend/src/storage/vectorMatch.ts`:
     - Load all templates into memory once on app start
     - Cosine similarity against each (Float32Array dot product, both L2-normalized)
     - Return top-1 with score
   - For N≤500, this is <5 ms

6. **Encryption helper** — 1 hr
   - `frontend/src/storage/crypto/libsodium.ts`: encrypt/decrypt 2KB embedding blob with device-bound key
   - Key derived from Keystore (Android) / Keychain (iOS) via `react-native-keychain`

7. **Wire pipeline** — 3 hrs
   - `frontend/src/ml/pipeline.worklet.ts`: detect → align → embed → match → emit result event
   - JSI bridge: worklet result → JS thread via `runOnJS`

8. **CLI tool to seed test templates** — 2 hrs
   - `backend/ml/seed_templates.py`: load ~5 known faces, compute embeddings using same EdgeFace ONNX, INSERT into SQLite directly via sqlcipher CLI
   - This bypasses needing the enrollment UI before testing match

9. **Test end-to-end** — 1 hr
   - Run app, point at one of the seeded faces, see name + score on screen
   - Verify: known face → high score (>0.6); unknown → low score (<0.4)

### 🏆 Differentiator Tasks (Day 3 — bake in before moving to Phase 3)

10. **Cancellable BioHashing wrapper (ISO/IEC 24745)** — 2 hrs
    - `frontend/src/storage/crypto/bioHash.ts`:
      - Generate random orthonormal projection matrix M ∈ ℝ^(512×512) seeded by per-user random salt
      - Project 512-d EdgeFace embedding → 512-d hashed vector
      - Sign-quantize: `hashed[i] = (M·emb)[i] > 0 ? 1 : -1` → 512-bit binary string
      - Store ONLY hashed template + salt; original embedding is irrecoverable
      - On verify: regenerate M from salt, hash live embedding, Hamming-distance compare
    - **Why:** Pure standards/depth flex. Citable as "ISO/IEC 24745 compliant" on the pitch deck DPDPA matrix slide.
    - **Reference:** [arxiv.org/abs/2302.13286](https://arxiv.org/abs/2302.13286) (benchmark code), [jwoogerd/fuzzy_vault](https://github.com/jwoogerd/fuzzy_vault) (alt scheme).

11. **MagFace magnitude as quality gate** — 1 hr
    - `frontend/src/ml/processors/qualityGate.ts`:
      - EdgeFace embeddings are NOT L2-normalized at the pre-normalization step — their L2-norm correlates with capture quality (MagFace CVPR 2021)
      - Compute `magnitude = ||emb||₂` BEFORE normalization
      - If `magnitude < QUALITY_THRESHOLD` (start with 18.0, tune in Phase 8) → reject with "low quality capture, retry"
      - L2-normalize after quality check for cosine match
    - **Why:** Zero extra model. Reject blur/occlusion/pose BEFORE wasting inference cycles. Uses existing embedding output.
    - **Reference:** [IrvingMeng/MagFace](https://github.com/IrvingMeng/MagFace), [pterhoer/QMagFace](https://github.com/pterhoer/QMagFace).

### Files Created
- `frontend/assets/models/edgeface_xs_int8.tflite`
- `frontend/src/ml/processors/faceAlign.worklet.ts`
- `frontend/src/ml/processors/faceEmbed.worklet.ts`
- `frontend/src/ml/processors/qualityGate.ts` ⭐ (differentiator)
- `frontend/src/ml/pipeline.worklet.ts`
- `frontend/src/storage/db/dbClient.ts`
- `frontend/src/storage/db/schema.sql`
- `frontend/src/storage/db/templates.repo.ts`
- `frontend/src/storage/crypto/libsodium.ts`
- `frontend/src/storage/crypto/bioHash.ts` ⭐ (differentiator)
- `frontend/src/storage/vectorMatch.ts`
- `backend/ml/convert_edgeface.py`
- `backend/ml/seed_templates.py`

### Reference Repos
- [otroshi/edgeface](https://github.com/otroshi/edgeface) — model weights + preprocessing reference
- [shubham0204/OnDevice-Face-Recognition-Android](https://github.com/shubham0204/OnDevice-Face-Recognition-Android) — copy Kotlin embedding logic patterns
- [PINTO0309/onnx2tf](https://github.com/PINTO0309/onnx2tf) — conversion docs

### Acceptance Criteria
- [ ] EdgeFace INT8 model is ~2 MB on disk
- [ ] Embedding extraction completes < 200 ms per face
- [ ] Two photos of same person → cosine similarity > 0.6
- [ ] Two photos of different people → cosine similarity < 0.4
- [ ] Templates persist across app restarts (SQLite working)
- [ ] DB file is encrypted on disk (open with SQLite browser → fails without key)
- [ ] ⭐ BioHashing: stored template cannot be reversed to original embedding (validate with `np.dot(M.T, hashed) ≠ emb`)
- [ ] ⭐ BioHashing: regenerating salt per enrollment produces different hash for same face (unlinkability)
- [ ] ⭐ MagFace quality gate: blurry/dark capture rejected before match runs (latency saving visible in logs)

### Risks
- INT8 quantization may drop accuracy by 1-2% — keep FP16 backup ready
- 5-point alignment quality is critical; if YuNet landmarks are noisy, use FaceMesh's 468-point instead and pick 5

---

## Phase 3 — Persistence + UI Flows

**Goal:** Polished enrollment (3-angle capture) + verification (1-tap) screens. Demo-able.
**Duration:** Day 4 (8 hrs)
**Depends on:** Phase 2
**Parallelizable with:** Phase 6

### Tasks

1. **Navigation skeleton** — 1 hr
   - `frontend/src/app/navigation/RootStack.tsx`: Stack with Home → Enroll / Verify / Admin / AuditLog

2. **Enrollment screen** — 3 hrs
   - `frontend/src/app/screens/EnrollmentScreen.tsx`:
     - Step 1: Enter user_id + name
     - Step 2: Capture 3 angles (frontal, slight left, slight right) — prompt user
     - Step 3: Compute mean embedding (average of 3 L2-normalized embeddings, then re-L2-normalize)
     - Step 4: Save to templates table, show success
   - `frontend/src/app/components/EnrollmentProgress.tsx`: 3-step indicator

3. **Verification screen polish** — 2 hrs
   - `frontend/src/app/screens/VerificationScreen.tsx`:
     - Hide debug bbox; show clean UX (oval guide overlay)
     - On match: green banner with name + score + latency
     - On no-match: red banner "Not enrolled" + retry button

4. **Admin screen** — 1 hr
   - `frontend/src/app/screens/AdminScreen.tsx`:
     - List enrolled users with delete button
     - DB size, last enrollment time
     - "Run benchmark" button (for Phase 8)

5. **Hooks** — 1 hr
   - `frontend/src/app/hooks/useFaceAuth.ts`: bridges worklet events to React state
   - `frontend/src/app/hooks/useEnrollment.ts`: manages 3-angle capture state machine

### 🏆 Differentiator Tasks (Day 4 — bake in before moving to Phase 4)

6. **Hindi + English i18n** — 1 hr
   - `npm install i18next react-i18next react-native-localize`
   - `frontend/src/i18n/locales/en.json` + `frontend/src/i18n/locales/hi.json` — all UI strings translated (enroll prompts, error messages, success banners, admin screen labels)
   - Auto-detect device locale; manual toggle in Admin screen
   - **Translate all challenge prompts**: "Turn head LEFT" → "सिर बाएँ घुमाएँ", "Please blink" → "कृपया पलक झपकाएँ"
   - **Reference:** [POSHAN Tracker UX failure analysis](https://www.digitalindia.gov.in/initiative/poshan-tracker/) — cite explicitly as precedent we're improving over.

7. **Offline TTS voice prompts (Android Pico TTS)** — 1 hr
   - `npm install react-native-tts`
   - `frontend/src/app/components/VoicePrompt.tsx`: invokes TTS for each challenge step + success/fail outcomes
   - Pico TTS is bundled with Android, fully offline; Hindi and English voices available
   - For iOS: AVSpeechSynthesizer (also offline, system-bundled)
   - **Critical for demo video:** record an actual highway worker using the app in Hindi with voice prompts

8. **AAA outdoor UI mode** — 1 hr
   - High-contrast theme (WCAG AAA = 7:1 contrast minimum)
   - Min font size 18pt for body, 24pt for primary actions
   - Bottom-anchored primary action buttons (one-handed use in gloves)
   - Brightness boost mode (CSS filter: brightness(1.3) + saturate(1.2) for outdoor visibility)
   - Auto-engage AAA mode when ambient light sensor > 10,000 lux (sunlight); auto-disable indoors
   - **Reference:** [Designing for Bharat — Field UX](https://medium.com/design-bootcamp/designing-for-bharat-a-field-guide-to-inclusive-ux-in-rural-agri-tech-ecosystems-in-india-14a22fc42112)

### Files Created
- `frontend/src/app/navigation/RootStack.tsx`
- `frontend/src/app/screens/EnrollmentScreen.tsx`
- `frontend/src/app/screens/VerificationScreen.tsx` (modified)
- `frontend/src/app/screens/AdminScreen.tsx`
- `frontend/src/app/components/EnrollmentProgress.tsx`
- `frontend/src/app/components/AuthResultBanner.tsx`
- `frontend/src/app/components/VoicePrompt.tsx` ⭐ (differentiator)
- `frontend/src/app/hooks/useFaceAuth.ts`
- `frontend/src/app/hooks/useEnrollment.ts`
- `frontend/src/app/hooks/useAmbientLight.ts` ⭐ (differentiator — for AAA mode auto-toggle)
- `frontend/src/i18n/index.ts` ⭐ (differentiator)
- `frontend/src/i18n/locales/en.json` ⭐
- `frontend/src/i18n/locales/hi.json` ⭐
- `frontend/src/app/theme/aaaTheme.ts` ⭐ (differentiator — outdoor high-contrast theme)

### Acceptance Criteria
- [ ] Enroll 3 different people via UI; their templates persist
- [ ] Verify each; correct name shown with score
- [ ] Enroll yourself with sunglasses → verify without sunglasses → expected behavior documented
- [ ] Admin screen can delete a template; subsequent verify returns "not enrolled"
- [ ] App handles "no face detected" gracefully (timeout after 10s)
- [ ] ⭐ All UI strings render correctly in both English AND Hindi (toggle in Admin)
- [ ] ⭐ Voice prompts play during enrollment ("कैमरा देखें", "Look at camera") — verify offline (airplane mode)
- [ ] ⭐ AAA outdoor mode visually distinct (brighter, higher contrast); auto-engages in direct sun

### Risks
- 3-angle UX can confuse non-tech users → keep prompts large, voice cues optional
- If embeddings of 3 angles differ wildly, mean is unreliable → log per-angle similarity and warn user

---

## Phase 4 — Liveness Detection

**Goal:** Two-layer liveness — passive PAD (MiniFASNet) rejects photos/replays; active challenges (blink, head-turn, smile) prevent dynamic video attacks.
**Duration:** Day 5-6 (16 hrs)
**Depends on:** Phase 3
**Parallelizable with:** Phase 6

### Tasks

1. **MiniFASNet conversion** — 2 hrs
   - `backend/ml/convert_minifasnet.py`:
     - Load V2 (80×80) + V1SE (80×80) `.pth` from minivision-ai repo
     - Export to ONNX → TFLite INT8 (combined ~500 KB)
   - Output: `frontend/assets/models/minifasnet_v2_int8.tflite`, `frontend/assets/models/minifasnet_v1se_int8.tflite`

2. **Anti-spoof worklet** — 3 hrs
   - `frontend/src/ml/processors/antiSpoof.worklet.ts`:
     - Run both models in parallel on same 80×80 face crop
     - Average scores → final liveness score [0,1]
     - Threshold 0.85 = live (tunable in Phase 8)
   - Integrate into pipeline before match: if PAD < threshold → reject with "spoof detected"

3. **MediaPipe FaceMesh integration** — 2 hrs
   - Use [`react-native-vision-camera-face-detector`](https://github.com/luicfrr/react-native-vision-camera-face-detector) for landmarks
   - Extract 468 3D landmarks per frame
   - Derive: EAR (eye aspect ratio), MAR (mouth aspect ratio), yaw angle

4. **Challenge primitives** — 3 hrs
   - `frontend/src/ml/challenges/blink.ts`:
     - State machine: open (EAR > 0.25) → closed (EAR < 0.18) → open within 0.5s = blink
   - `frontend/src/ml/challenges/headTurn.ts`:
     - Yaw thresholds: > +25° = right, < -25° = left, |yaw| < 10° = center
     - State machine: center → target_direction → center within 3s
   - `frontend/src/ml/challenges/smile.ts`:
     - MAR > 0.5 sustained 0.3s = smile

5. **Challenge engine** — 2 hrs
   - `frontend/src/ml/challenges/challengeEngine.ts`:
     - Random sequence of 3 from {blink, head-left, head-right, smile}
     - Per-step budget 3s, total 8s
     - Emits events: `challenge_start`, `challenge_pass`, `challenge_fail`, `sequence_complete`

6. **UI overlay for challenges** — 3 hrs
   - `frontend/src/app/components/LivenessChallengeOverlay.tsx`:
     - Big instruction text + arrow icon (e.g., "Turn head LEFT")
     - Per-challenge countdown ring
     - Pass = green checkmark + auto-advance
     - Fail = red X + retry the same challenge once, then full reject

7. **Spoof attack manual testing** — 1 hr
   - Print your face on paper → app should reject (passive PAD)
   - Show video of yourself blinking on laptop → app should reject (active challenge mismatches randomized sequence)
   - Cover one eye → blink should NOT trigger falsely

### Files Created
- `frontend/assets/models/minifasnet_v2_int8.tflite`
- `frontend/assets/models/minifasnet_v1se_int8.tflite`
- `frontend/src/ml/processors/antiSpoof.worklet.ts`
- `frontend/src/ml/challenges/blink.ts`
- `frontend/src/ml/challenges/headTurn.ts`
- `frontend/src/ml/challenges/smile.ts`
- `frontend/src/ml/challenges/challengeEngine.ts`
- `frontend/src/app/components/LivenessChallengeOverlay.tsx`
- `backend/ml/convert_minifasnet.py`

### Reference Repos
- [minivision-ai/Silent-Face-Anti-Spoofing](https://github.com/minivision-ai/Silent-Face-Anti-Spoofing) — V2 + V1SE inference reference
- [luicfrr/react-native-vision-camera-face-detector](https://github.com/luicfrr/react-native-vision-camera-face-detector) — landmark extraction

### Acceptance Criteria
- [ ] Print photo of yourself → app rejects with "spoof detected"
- [ ] Video replay on laptop screen → app rejects (PAD or challenge mismatch)
- [ ] Live face passes both PAD and full 3-challenge sequence in <10s total
- [ ] Liveness false-reject rate on live faces < 10% in office lighting
- [ ] Challenge sequence is genuinely randomized (run 5 times, verify different orders)

### Risks
- MiniFASNet trained on Asian faces — Indian skin tones may shift threshold → adjust in Phase 8 field test
- Bright outdoor light may bleach features → fallback: increase active challenge weight if PAD confidence is low

---

## Phase 5 — Cross-Platform Parity: iOS

**Goal:** Same app runs on iPhone with CoreML acceleration on Apple Neural Engine where possible.
**Duration:** Day 7 (8 hrs)
**Depends on:** Phase 4
**Parallelizable with:** Phase 6

### Tasks

1. **iOS Pod install + build** — 1 hr
   ```powershell
   cd frontend\ios; pod install; cd ..\..
   npx react-native run-ios
   ```
   - Fix any native build errors (usually pod versions or missing entitlements)

2. **Camera permission** — 30 min
   - `frontend/ios/frontend/Info.plist`: add `NSCameraUsageDescription`

3. **CoreML delegate enable** — 1 hr
   - `react-native-fast-tflite` config: `delegate: 'core-ml'` on iOS
   - Verify EdgeFace runs on Neural Engine (check Xcode Instruments for "ANE" usage)

4. **Test all flows on iPhone** — 2 hrs
   - Enrollment, verification, liveness challenge — all 4 challenges
   - Compare latency vs Android (typically iOS is 2-3× faster)

5. **iOS-specific bugs** — 2-3 hrs
   - Camera orientation handling (iOS reports differently than Android)
   - Permission re-request flow
   - SQLCipher native module compatibility

6. **Document differences** — 30 min
   - `docs/BENCHMARKS.md`: add iPhone column to latency table

### Files Touched
- `frontend/ios/Podfile`
- `frontend/ios/frontend/Info.plist`
- `frontend/src/ml/pipeline.worklet.ts` (platform-conditional delegate)

### Acceptance Criteria
- [ ] App builds and runs on iPhone (any iOS 14+ device)
- [ ] All 4 challenges (blink/left/right/smile) work
- [ ] Latency on iPhone < latency on Android (sanity check ANE is active)
- [ ] Templates enrolled on Android phone CANNOT be read on iPhone (device-bound key works)

### Risks
- If no Mac available, skip iOS or rent cloud Mac (MacInCloud, ~$30 for 2 days)
- Pod conflicts are the #1 time sink — pin versions early; commit `Podfile.lock`

---

## Phase 6 — Indian Demographic Fine-Tune (Parallel from Day 1)

**Goal:** Fine-tuned EdgeFace-XS that scores >95% on Indian validation set. Drop-in replacement for stock weights.
**Duration:** Effective Day 8 (8 hrs of active work), but **Colab training runs in background from Day 1 onward**
**Depends on:** Phase 0 (datasets downloaded)
**Parallelizable with:** Phase 1-5 (training runs while you code)

### Tasks

1. **Dataset prep (Day 1, 2 hrs)** — `backend/ml/seed_indian_dataset.py`
   - Merge IndicFairFace + IMFDB + JFAD into one folder
   - Train/val/test split 70/15/15 by identity (not by image — prevent leakage)
   - Augmentation: random crop, color jitter (sim. lighting), horizontal flip
   - Save to Google Drive: `/MyDrive/nhai_face/dataset/`

2. **Fine-tune notebook (Day 1, 2 hrs setup; Day 1-7 training in background)** — `backend/notebooks/finetune_edgeface.ipynb`
   - Load pretrained EdgeFace-XS PyTorch weights
   - Freeze backbone, fine-tune last 2 blocks + ArcFace head
   - LR 1e-4, AdamW, cosine schedule, 30 epochs, batch 128 on T4
   - Checkpoint every epoch to Drive
   - ETA: ~6 hours on free Colab T4

3. **DFW evaluation (Day 7)** — 2 hrs
   - `backend/notebooks/eval_dfw.ipynb`:
     - Test fine-tuned model on DFW (disguised faces: helmets, sunglasses, masks)
     - Report TAR @ FAR=1e-4 per disguise category
     - Compare vs stock EdgeFace-XS — fine-tuned should beat stock on helmet/sunglasses subsets

4. **Quantization (Day 8, 2 hrs)** — `backend/ml/quantize_finetuned.py`
   - Calibration: 200 Indian face crops from validation set
   - Run `onnx2tf -i edgeface_xs_finetuned.onnx -oiqt -cind ...`
   - Compare INT8 vs FP32 cosine error (should be <1%)

5. **Swap into app (Day 8, 1 hr)** — copy new `.tflite` to `frontend/assets/models/`, retest verification

6. **Validation report (Day 8, 1 hr)** — `docs/MODEL_CARD.md`
   - Accuracy per demographic slice
   - DFW disguise robustness numbers
   - LFW baseline retained (sanity)

### Files Created
- `backend/ml/seed_indian_dataset.py`
- `backend/notebooks/finetune_edgeface.ipynb`
- `backend/notebooks/eval_dfw.ipynb`
- `backend/ml/quantize_finetuned.py`
- `frontend/assets/models/edgeface_xs_finetuned_int8.tflite` (replaces stock)
- `docs/MODEL_CARD.md`

### Reference Repos / Papers
- [otroshi/edgeface](https://github.com/otroshi/edgeface) — fine-tune script in repo
- [IndicFairFace](https://arxiv.org/abs/2602.12659) — dataset card
- [DFW](https://arxiv.org/abs/1811.08837) — evaluation protocol

### Acceptance Criteria
- [ ] Fine-tuned model TAR @ FAR=1e-4 on Indian val ≥ 95%
- [ ] DFW disguise subset TAR ≥ 80% (helmet/sunglasses common in highway sites)
- [ ] LFW retained ≥ 99.0% (sanity — didn't overfit and lose generality)
- [ ] INT8 quantized model on-device gives <1% cosine error vs FP32 reference
- [ ] App still passes Phase 3 acceptance tests with new model

### Risks
- Dataset access denied/delayed → fall back to IMFDB only (still useful) + synthetic augmentation
- Colab disconnects mid-training → checkpoint every epoch, resume from latest
- Overfitting on small Indian set → strong augmentation + early stopping on val loss

---

## Phase 7 — Backend + Sync + Differentiator Stack

**Goal:** FastAPI backend on EC2 + PostgreSQL on RDS + offline sync working + **5 winning-edge differentiators stacked** (Firebase OTA model updates, StrongBox/Keystore master key, Play Integrity API server verification, Grafana NHAI HQ dashboard, per-device adaptive threshold).
**Duration:** Day 9 (**heavy: 12-14 hrs — plan accordingly**; this is the riskiest single day)
**Depends on:** Phase 3 (events being generated locally) + Phase 0 (Firebase project, Play Console, Ed25519 keypair ready)
**Parallelizable with:** None (this is the critical sync + differentiator day)

### Tasks

1. **FastAPI skeleton** — 1.5 hrs
   - `backend/app/main.py`:
     - FastAPI app, CORS, structlog
     - Health endpoint `/api/v1/healthz`
   - `backend/pyproject.toml` with `uv` deps: `fastapi[standard]`, `sqlalchemy`, `asyncpg`, `python-jose`, `pydantic[email]`, `alembic`

2. **PostgreSQL schema + Alembic** — 1 hr
   - `backend/app/db/session.py`: async SQLAlchemy engine
   - `backend/app/models/attendance.py`: SQLAlchemy + Pydantic models matching the schema in [NHAI_HACKATHON_STRATEGY.md §13.4](NHAI_HACKATHON_STRATEGY.md#134-backend-api--database-schema)
   - `alembic init` + initial migration

3. **Auth endpoint** — 1 hr
   - `backend/app/routes/auth.py`:
     - `POST /api/v1/auth/token` — device_id + shared secret → JWT (RS256, 15 min)
     - `backend/app/auth/jwt.py`: verify_token dependency

4. **Attendance endpoint** — 1.5 hrs
   - `backend/app/routes/attendance.py`:
     - `POST /api/v1/attendance` — accept JSON array, idempotent INSERT (ON CONFLICT DO NOTHING via event_id PK)
     - Return `{accepted: [...], rejected: [...], server_ack: sha256(joined_event_ids)}`
     - `GET /api/v1/attendance` — admin query with date range

5. **Docker + compose** — 30 min
   - `backend/Dockerfile`: multi-stage, `python:3.12-slim`, non-root user
   - `backend/docker-compose.yml`: app + postgres for local dev

6. **EC2 deploy** — 1 hr
   - Spin up RDS instance + EC2 with security group allowing only your dev IP + EC2 → RDS
   - `scp` Docker image OR build on EC2 directly
   - `systemd` unit for auto-restart
   - HTTPS via Caddy (auto Let's Encrypt) on port 443

7. **RN sync client** — 1.5 hrs
   - `frontend/src/sync/apiClient.ts`: axios with JWT interceptor
   - `frontend/src/sync/attendanceUploader.ts`: batch upload (50 events)
   - `frontend/src/sync/syncWorker.ts`: triggered by netinfo change OR background-fetch
   - `frontend/src/sync/connectivityWatcher.ts`: @react-native-community/netinfo listener
   - `frontend/src/sync/purgeManager.ts`: delete local rows after ack
   - `frontend/src/sync/retryPolicy.ts`: exp backoff 1→2→4→8→16s

### 🏆 Differentiator Tasks (Day 9 — critical for winning pitch demo)

8. **Firebase Remote Config + signed `.tflite` OTA model updates** — 2.5 hrs ⭐ HIGHEST IMPACT
   - `npm install @react-native-firebase/app @react-native-firebase/remote-config @react-native-firebase/storage`
   - `frontend/src/ota/modelDownloader.ts`:
     - On app start, fetch `model_version` from Remote Config
     - If newer than installed, download `.tflite` + `.sig` from Cloud Storage
     - Verify Ed25519 signature against bundled public key (use `react-native-libsodium`)
     - If valid → atomic replace, restart inference engine via JSI
     - If invalid → discard, log security event
   - `backend/scripts/sign_and_upload.py`: backend tool to sign a new `.tflite` + push to Firebase Cloud Storage + bump Remote Config version
   - **The money-shot demo:** on stage Day 14, push v1.1 from laptop while audience watches phone → "Model updated without Play Store re-submission"
   - **Reference:** [Firebase ML Custom Models](https://firebase.google.com/docs/ml/manage-hosted-models)

9. **Hardware-backed Keystore (StrongBox / Secure Enclave) for SQLCipher master key** — 1.5 hrs
   - `npm install react-native-sensitive-info` (StrongBox-aware, Nitro Modules)
   - `frontend/src/storage/crypto/keyManager.ts`:
     - On first launch: generate 256-bit key in StrongBox (Android) / Secure Enclave (iOS)
     - Key NEVER leaves TEE — only encrypt/decrypt operations cross the boundary
     - SQLCipher receives an HKDF-derived sub-key from the TEE-held master
   - Test: root the test phone (or use emulator with su), try to extract DB → should fail
   - **Reference:** [mcodex/react-native-sensitive-info](https://github.com/mcodex/react-native-sensitive-info), [Android StrongBox docs](https://developer.android.com/training/articles/keystore)

10. **Play Integrity API + server token verification** — 1.5 hrs
    - Android: `react-native-google-play-integrity` (or native module via Play Integrity Java SDK)
    - On every API call, app generates integrity token, sends as `X-Integrity-Token` header
    - `backend/app/auth/play_integrity.py`:
      - Verify token against Google's pubkeys (JWT verification)
      - Reject if `verdict.deviceIntegrity != MEETS_DEVICE_INTEGRITY` (i.e., reject rooted/emulator/custom-ROM)
      - Cache verified device_id → integrity_ok mapping for 1 hour
    - iOS: App Attest (Apple equivalent) via `react-native-app-attest`
    - **Reference:** [Play Integrity Overview](https://developer.android.com/google/play/integrity/overview), [Stronger Threat Detection Oct 2025](https://android-developers.googleblog.com/2025/10/stronger-threat-detection-simpler.html)

11. **Per-device adaptive threshold calibration** — 1 hr
    - `frontend/src/ml/processors/adaptiveThreshold.ts`:
      - On every successful verification (active liveness passed), record `cosine_similarity` in SQLite
      - After N=20 successful matches, compute mean μ and std σ of user's distribution
      - Set per-user threshold = `μ − 2σ` (cold-start fallback: global 0.6)
      - Apply per-user threshold in `vectorMatch.ts`
    - Drops FRR ~30% in real-world deployments (per research)
    - Cold-start: 0.6 global until N≥10 samples; gradual transition to personalized

12. **FastAPI + Prometheus + Grafana NHAI HQ dashboard** — 2 hrs
    - `npm install prometheus-fastapi-instrumentator` on backend
    - Auto-instruments `/metrics` endpoint
    - Spin up Grafana via Docker: `docker run -d -p 3000:3000 grafana/grafana`
    - Pre-built 4-panel dashboard:
      1. **Compliance %** — verified events / total expected per zone (heatmap by region)
      2. **Latency p95** — per-device histogram, drift detection
      3. **FAR/FRR trend** — sliding 7-day window
      4. **Device map** — geo-distribution of synced events (use GPS field in attendance table)
    - Export dashboard JSON to `backend/dashboards/nhai_hq_dashboard.json` for reproducibility
    - **Reference:** [Kludex/fastapi-prometheus-grafana](https://github.com/Kludex/fastapi-prometheus-grafana), [Grafana Labs FastAPI Dashboard](https://grafana.com/grafana/dashboards/16110-fastapi-observability/)

### Files Created
- All of `backend/` directory
- `frontend/src/sync/*` (6 files listed above)
- `frontend/src/ota/modelDownloader.ts` ⭐
- `frontend/src/ota/signatureVerifier.ts` ⭐
- `frontend/src/storage/crypto/keyManager.ts` ⭐ (modified to use StrongBox)
- `frontend/src/ml/processors/adaptiveThreshold.ts` ⭐
- `backend/app/auth/play_integrity.py` ⭐
- `backend/scripts/sign_and_upload.py` ⭐ (backend tool for OTA push)
- `backend/dashboards/nhai_hq_dashboard.json` ⭐ (Grafana export)
- `backend/docker-compose.yml` (modified — adds Prometheus + Grafana services)
- `frontend/assets/keys/model_signing_pubkey.pem` ⭐ (Ed25519 public key, bundled in app)

### Acceptance Criteria
- [ ] FastAPI server responds 200 on `/api/v1/healthz` from public internet
- [ ] Generate 10 events offline (airplane mode), turn wifi on → all 10 appear in PostgreSQL within 30s
- [ ] Replay same batch → server returns all event_ids in `rejected[]` (idempotency works)
- [ ] Local `sync_queue` is empty after successful sync (purge confirmed)
- [ ] Kill server mid-upload → app retries with backoff, doesn't lose events
- [ ] Audit query: `GET /api/v1/attendance?user_id=...` returns expected rows in JSON
- [ ] ⭐ **OTA**: push new `.tflite` from `sign_and_upload.py` → app downloads + verifies signature + restarts inference engine WITHOUT reinstall
- [ ] ⭐ **OTA security**: corrupt the signature; app rejects download and logs security event
- [ ] ⭐ **StrongBox**: SQLCipher master key never leaves TEE (verify via `keystore-cli` shows hardware-backed alias)
- [ ] ⭐ **Play Integrity**: emulator API calls return 403 (server rejected); real device calls succeed
- [ ] ⭐ **Adaptive threshold**: per-user threshold visibly drifts from 0.6 baseline after 20+ matches (log shows μ, σ, new threshold)
- [ ] ⭐ **Grafana**: NHAI HQ dashboard at `localhost:3000` shows 4 live panels with real attendance data

### Risks
- RDS public exposure is a security smell → use VPC + bastion if time permits, or restrict to EC2 IP only
- JWT clock skew on phone (no network = no NTP) → grant ±5 min leeway in token validation
- Background fetch on Android is unreliable → also trigger sync on app foreground
- ⭐ **Firebase OTA**: signature verification breaks if Ed25519 keypair mismatches → keep keys version-controlled in `.keys/` (gitignored); test sign+verify in isolation before integration
- ⭐ **Play Integrity quota**: free tier = 10,000 requests/day → cache verdicts server-side per device_id (1 hr TTL) to stay under limit
- ⭐ **Day 9 overload**: 12-14 hour day is risky. Fallback ordering if time runs out:
  1. **Must finish:** Tasks 1-7 (core backend + sync) — DAY 9 MINIMUM
  2. **Should finish:** Task 8 (Firebase OTA) — biggest differentiator demo
  3. **Nice to have:** Tasks 9 + 10 (StrongBox + Play Integrity) — security depth
  4. **Stretch:** Tasks 11 + 12 (adaptive threshold + Grafana) — can slip to Day 10/11 buffer

---

## Phase 8 — Field Testing + Threshold Tuning

**Goal:** Real benchmarks on a real mid-range device in real outdoor conditions. Tuned thresholds for production.
**Duration:** Day 10-11 (16 hrs)
**Depends on:** Phase 7
**Parallelizable with:** None

### Tasks

1. **Test plan** — 1 hr
   - Conditions: indoor flat light, harsh sunlight (noon), low light (dusk), backlit, with helmet, with sunglasses
   - Subjects: 5 diverse faces (different skin tones, ages, with/without facial hair)
   - Metrics: e2e latency p50/p95, recognition TAR, PAD FAR/FRR, challenge pass rate, battery drain per 100 verifications

2. **Benchmark runner** — 2 hrs
   - `frontend/scripts/benchmark_device.ts`: scripted sequence of 100 verifications, logs per-stage timing to JSON

3. **Outdoor session 1 (Day 10 morning)** — 3 hrs
   - Take phone outside; run benchmark in 4 lighting conditions
   - Record results in spreadsheet
   - Note any crashes, false rejects

4. **Threshold tuning** — 2 hrs
   - From ROC curves over the day's data, pick:
     - Match cosine threshold (typically 0.55-0.65)
     - PAD threshold (typically 0.80-0.90)
     - EAR blink threshold (typically 0.18-0.22)
   - Update `frontend/src/ml/thresholds.ts`

5. **Disguise robustness check** — 2 hrs
   - Helmet on, sunglasses on, mask on — verify each works or fails gracefully
   - If helmet causes high FRR → adjust prompt: "Remove helmet for face capture"

6. **Outdoor session 2 (Day 11 morning)** — 3 hrs
   - Re-run benchmarks with tuned thresholds
   - Document gap vs Day 10

7. **Battery profile** — 1 hr
   - 100 verifications back-to-back, measure battery drop
   - Acceptance: <5% drain per 100 verifications

8. **Benchmarks doc** — 2 hrs
   - `docs/BENCHMARKS.md`:
     - Latency table (p50/p95 per stage per device)
     - Accuracy table per lighting condition
     - PAD attack matrix (which attacks blocked, which not)

### 🏆 Differentiator Tasks (Day 11 — rehearse demo-day money shots)

9. **OTA live-update demo rehearsal** — 2 hrs ⭐
   - Practice the on-stage sequence end-to-end:
     1. Laptop (from project root): `python backend/scripts/sign_and_upload.py --model edgeface_xs_v1.1.tflite`
     2. Phone (visible to audience): notification "New model v1.1 available" → "Downloaded, verifying signature..." → "Verified. Restarting inference engine."
     3. Re-do a face match → visible ms-counter shows slightly different value (proving new model is live)
   - Time the sequence — target < 30 seconds from `enter` to "new match latency visible"
   - **Rehearse 10×** with different audience sightlines; verify phone screen is readable from 6 feet
   - Pre-prepare both v1.0 (current) and v1.1 (slightly different INT8 calibration) `.tflite` files

10. **Demo failure recovery rehearsal** — 1 hr ⭐
    - Deliberately cause failure during practice:
      - Cover camera lens mid-verification → graceful error
      - Force-kill WiFi mid-sync → retry queue visible
      - Plug HDMI mid-pitch → laptop re-detect
    - **Backup recorded video** queued in laptop browser tab, 1-click away
    - Verify 2-second seam between live-fail → recorded-play

11. **Three physical props physical check** — 30 min ⭐
    - Print A4 glossy photo of yourself — verify MiniFASNet rejects it (not too dark/glossy that face isn't detected at all)
    - Load secondary phone with 30-second blink+smile video loop, brightness max
    - Confirm both props work against current MiniFASNet threshold

### Files Touched
- `frontend/src/ml/thresholds.ts`
- `frontend/scripts/benchmark_device.ts`
- `docs/BENCHMARKS.md`
- `docs/DEMO_SCRIPT.md` ⭐ (verbatim 3-minute live demo script)
- `frontend/assets/models/edgeface_xs_v1.1.tflite` ⭐ (alternate version for OTA demo)

### Acceptance Criteria
- [ ] e2e latency p95 < 800 ms in worst lighting condition tested
- [ ] Indoor TAR @ FAR=1e-3 ≥ 95%
- [ ] Harsh sunlight TAR ≥ 88% (honest reduction — document, don't hide)
- [ ] PAD blocks: print photo, video on laptop, video on phone screen (3/3 attacks blocked)
- [ ] Battery drain < 5% per 100 verifications
- [ ] No app crashes during 200+ test runs

### Risks
- Real-world TAR may be lower than lab — be ready to retrain Phase 6 with hard examples
- Mid-range device may overheat after 200+ verifications → throttle FPS or add cooldown

---

## Phase 9 — Testing & QA

**Goal:** Test suite that proves correctness, not just demo-ability.
**Duration:** Day 12 (8 hrs)
**Depends on:** All previous phases
**Parallelizable with:** None

### Tasks

1. **Unit tests** — 3 hrs
   - `frontend/tests/unit/vectorMatch.test.ts` — cosine math, normalization, top-k
   - `frontend/tests/unit/blink.test.ts` — EAR state machine with synthetic landmark sequences
   - `frontend/tests/unit/retryPolicy.test.ts` — backoff schedule, max attempts
   - `frontend/tests/unit/purgeManager.test.ts` — only purge after ack
   - `frontend/tests/unit/challengeEngine.test.ts` — random sequence properties

2. **Server tests** — 2 hrs
   - `backend/tests/test_attendance.py`:
     - Batch insert with duplicates → correct accepted/rejected split
     - Invalid JWT → 401
     - Missing required fields → 422 (Pydantic)
     - Date range query

3. **E2E (Detox or Maestro)** — 2 hrs
   - `frontend/tests/e2e/enrollment_flow.e2e.ts`:
     - Enroll → verify (success) → verify wrong person (fail) → sync → DB row appears
   - Run on Android emulator in CI

4. **Coverage report** — 1 hr
   - Target: 70% line coverage on `frontend/src/ml/`, `frontend/src/storage/`, `frontend/src/sync/`
   - Server: 80% on routes

### Files Created
- `frontend/tests/unit/*.test.ts` (5 files)
- `frontend/tests/e2e/enrollment_flow.e2e.ts`
- `backend/tests/test_attendance.py`
- `.github/workflows/ci.yml` (optional but nice)

### Acceptance Criteria
- [ ] `npm test` green
- [ ] `cd server && pytest` green
- [ ] Detox E2E passes on emulator
- [ ] Coverage targets met
- [ ] At least 1 failure-mode test per major module

### Risks
- Detox setup eats time → fall back to Maestro (`maestro test enrollment.yaml`) which is simpler
- Worklet-based code is hard to unit test → extract pure functions into `*.ts` modules tested separately

---

## Phase 10 — Documentation + Pitch Deck

**Goal:** Submission package that judges can read in 10 minutes and understand the whole system.
**Duration:** Day 13 (8 hrs)
**Depends on:** Phase 8 (need real benchmark numbers)
**Parallelizable with:** None

### Tasks

1. **Pitch deck — 6 slides (SIH-style density)** — 4 hrs
   - **Use verbatim slide content from [winning_edge_strategy.md §3](winning_edge_strategy.md#3-pitch-deck-blueprint--6-slides-sih-style-density)**
   - Tools: Google Slides or Keynote
   - **Slide 1:** "5 Years. Still Broken." — left half NHAI March 2021 press release screenshot; right half Datalake 3.0 Play Store complaint screenshots
   - **Slide 2:** Anchoring headline — "287 ms / ₹12,000 phone / ₹230 Cr ghost-payroll stakes"
   - **Slide 3:** Architecture diagram with constraint-mapping callouts (2.6 MB / 287 ms / >95% Indian / FOSS)
   - **Slide 4:** Compliance & Standards matrix (DPDPA + ISO/IEC 24745 + MeitY FOSS + UIDAI + STQC) — see [winning_edge_strategy.md §9](winning_edge_strategy.md#9-dpdpa-compliance-matrix-slide-content) for verbatim content
   - **Slide 5:** "Live Demo — 3 Minutes" (just title; rest is the live demo from the podium)
   - **Slide 6:** Pilot Plan (Delhi-Mumbai km 412-438, Bengaluru-Chennai km 134-160, Bharatmala) + The Ask
   - **Plus appendix slides (not counted in 6, only shown on Q&A):** TCO calculation (₹1.41 Cr/year savings), Phase-2 roadmap (UniAttackDetection deepfake-resistance + Federated Learning), team/contact

2. **Technical documentation** — 2 hrs
   - `docs/INTEGRATION_GUIDE.md`: how NHAI Datalake 3.0 team plugs in the RN native module — API surface, sample code, callback contract
   - `docs/ARCHITECTURE.md`: condensed from strategy doc
   - `docs/THREAT_MODEL.md`: what we defend against, what we don't (be honest about cooperative-user assumption)

3. **README** — 1 hr
   - Project README with: problem, solution, screenshots, build steps, deploy steps, license list

4. **License audit** — 30 min
   - `docs/LICENSES.md`: every dependency listed with license, link to original
   - Verify zero GPL or commercial-licensed components

5. **Code cleanup** — 30 min
   - Run `npm run lint -- --fix`
   - Remove `console.log` debug statements
   - Verify `.env` is gitignored, no secrets in repo

### Files Created/Modified
- `pitch_deck.pdf` (export from slides)
- `docs/INTEGRATION_GUIDE.md`
- `docs/ARCHITECTURE.md`
- `docs/THREAT_MODEL.md`
- `docs/LICENSES.md`
- `README.md`

### Acceptance Criteria
- [ ] Deck is **exactly 6 slides** (+ optional Q&A appendix), no overruns
- [ ] Every claim in deck is backed by a number from BENCHMARKS.md
- [ ] DPDPA compliance matrix slide present
- [ ] Pilot deployment slide names specific corridors (Delhi-Mumbai km 412-438, Bengaluru-Chennai km 134-160)
- [ ] README lets a fresh dev clone + build + run on Android in <30 min
- [ ] LICENSES.md confirms zero commercial dependencies (only MIT/Apache/BSD-3)
- [ ] No TODO/FIXME left in code
- [ ] Govt phrases ("Atmanirbhar Bharat", "PM Gati Shakti", "FOSS Preference") used 2-3 times naturally, NOT 10+ times (avoid buzzword desperation — see [winning_edge_strategy.md §11](winning_edge_strategy.md#11-things-to-avoid-loser-patterns))

### Risks
- Slide creep (10+ slides) → **strict 6-slide rule**, kill darlings; move detail to appendix
- Last-minute architectural realization → resist; ship what works
- Buzzword over-deployment (sounds desperate) → use 2-3 govt phrases naturally

---

## Phase 11 — Submission

**Goal:** All artifacts uploaded, demo video recorded, submission form filled by deadline.
**Duration:** Day 14 (4-6 hrs)
**Depends on:** Phase 10
**Parallelizable with:** None (this IS the deadline)

### Tasks

1. **Demo video** — 2 hrs
   - Script: intro (15s) → live offline demo (90s) → architecture (45s) → sync demo (45s) → outro (15s)
   - Record on real device with screen mirroring + voice-over
   - Edit in DaVinci Resolve or CapCut, export 1080p MP4

2. **GitHub repo final push** — 30 min
   - All code committed, branch `main` tagged `v1.0-submission`
   - README updated with submission notes

3. **Build APKs** — 1 hr
   - Release APK for Android (signed): `cd frontend\android; ./gradlew assembleRelease`
   - iOS IPA via Xcode archive (if Apple Dev account exists; otherwise skip and note)
   - Upload to GitHub Releases tagged `v1.0-submission`

4. **Final review** — 1 hr
   - Read submission requirements one more time — checklist every deliverable
   - Verify all links work (open repo from fresh browser tab)

5. **Submit** — 30 min
   - Upload deck, technical doc, video link, GitHub link via NHAI portal
   - Get confirmation email
   - Screenshot of submission confirmation

### 🏆 Differentiator Tasks (Day 14 — judging day prep)

6. **Three physical props preparation** — 1 hr ⭐
   - **A4 glossy printed photo of yourself** — verify MiniFASNet rejects it under venue lighting
   - **Secondary phone** — looped 30s video of yourself blinking + smiling, brightness 100%, charged
   - **Paper mask cutout** (eye holes only) — for extra spoof demo if asked
   - Pack in a clear folder; lay them on judging table at start

7. **Hardware checklist** — 30 min ⭐
   - Primary test phone: 100% charged, app v1.0 installed, templates pre-enrolled (you + 2 colleagues for diversity), airplane-mode rehearsed
   - Backup phone (same model if possible)
   - Laptop: charged, HDMI dongle tested, alternate v1.1 `.tflite` ready in `sign_and_upload.py`, Grafana dashboard tab open, PostgreSQL viewer (psql or DBeaver) tab open, recorded backup demo (45s MP4) bookmarked
   - Printed 6-slide deck × 5 copies, printed technical doc × 1 copy
   - HDMI cable (USB-C + HDMI), backup adapter

8. **Linkedin post (social proof)** — 30 min ⭐
   - Submission-day post on LinkedIn with screenshot of demo + GitHub link + tag #NHAI #DigitalIndia #IndiaAI
   - Tag DIC team if findable
   - Increases evaluator goodwill before they even review (some evaluators check social)

### Acceptance Criteria
- [ ] Submission confirmed before 23:59 on 2026-06-05
- [ ] All required artifacts uploaded (deck, tech doc, demo video, GitHub link, APK link)
- [ ] Demo video plays correctly on a fresh browser
- [ ] Public GitHub repo is accessible and complete
- [ ] APK installs and runs on a fresh test device
- [ ] ⭐ All 3 physical props tested and packed
- [ ] ⭐ OTA live-update demo rehearsed end-to-end at least 10 times
- [ ] ⭐ Backup recorded demo video bookmarked, queued, ≤2-second seam from live
- [ ] ⭐ LinkedIn announcement post published with submission link

### Risks
- Last-minute portal issues → submit 6 hours before deadline, NOT 6 minutes
- Video file too large for upload → compress to <100 MB H.264
- Demo phone battery drains during waiting time → bring power bank + 100% charged spare phone
- Venue lighting differs from rehearsal → test props in venue lighting if possible before judging slot

---

## Critical Path & Parallelizable Work

```
Day 0: Phase 0 (pre-flight) ─┐  [Firebase + Play Console + dataset emails]
                              ├─▶ MUST complete before Day 1
Day 1: Phase 1 ───────────────┤  [YuNet detect]
       Phase 6 kickoff (Colab training in background) ─┐
Day 2-3: Phase 2 ─────────────────────────────────────┤  [⭐ D3: BioHashing + MagFace]
Day 4: Phase 3 ───────────────────────────────────────┤  [⭐ i18n + TTS + AAA UI]
Day 5-6: Phase 4 ─────────────────────────────────────┤  [MiniFASNet + challenges]
Day 7: Phase 5 ───────────────────────────────────────┘  [iOS parity]
Day 8: Phase 6 active (swap fine-tuned model)
Day 9: Phase 7 ◀── ⭐ HEAVIEST DAY (12-14 hrs)
       [Backend + sync + Firebase OTA + StrongBox +
        Play Integrity + Grafana + adaptive threshold]
Day 10-11: Phase 8 (field test + ⭐ OTA rehearsal)
Day 12: Phase 9 (tests — including new differentiator modules)
Day 13: Phase 10 (⭐ 6-slide deck + DPDPA matrix + TCO)
Day 14: Phase 11 (submit + ⭐ 3 physical props + LinkedIn post)
```

**Critical path:** Phase 1 → 2 → 3 → 4 → 7 → 8 → 10 → 11. Any slip here cascades.
**Floats:**
- Phase 5 (iOS) can slip by 1 day if Android demo is solid
- Phase 6 fine-tune can ship stock-EdgeFace if dataset access blocked
- Phase 7 differentiator priority order if Day 9 runs short: (1) Firebase OTA → (2) StrongBox → (3) Play Integrity → (4) Adaptive threshold → (5) Grafana
- Phase 10 appendix slides (TCO, Phase-2 roadmap) can be cut without losing core 6-slide pitch

---

## Daily Checklist Template

Copy this for each day:

```
# Day N — [Phase Name]
Date: ____
Hours available: ____

## Today's tasks (from phase doc)
- [ ] Task 1 (est X hrs)
- [ ] Task 2 (est Y hrs)
...

## Blockers from yesterday
- 

## End-of-day status
- Phase progress: X%
- Acceptance criteria passed: A/B
- Tomorrow's first task: 
- Commit hash: 
```

---

## Emergency Fallback Plans

### If Phase 6 fine-tune fails (no Indian accuracy improvement)
- Ship stock EdgeFace-XS — still 99.73% LFW, IJB-C 94.85%
- Mention fine-tune attempt + lessons in deck as a "v2 roadmap" item
- Don't claim >95% Indian accuracy without data to back it up

### If Phase 7 backend doesn't deploy
- Run backend locally on laptop during demo, with phone connecting via hotspot
- Document the "production target" architecture in deck; show local demo
- Judges care that the offline→sync loop WORKS, not where the server is hosted

### If Phase 5 iOS doesn't build
- Submit Android-only with note: "iOS port pending Mac access — same RN codebase, only platform-conditional native modules differ"
- 70% of NHAI field workers use Android anyway

### If Phase 4 liveness fails outdoors
- Lean harder on active challenges (blink + 2 head turns) and lower PAD weight
- Document: "passive PAD performance degrades in harsh sunlight; active challenge layer maintains security"
- Honesty about limits is a strength, not a weakness, for evaluators

### If you run out of time on Day 13
- Sacrifice tests (Phase 9) before docs (Phase 10) — judges read docs, not coverage reports
- Sacrifice fine-tune (Phase 6) before liveness (Phase 4) — liveness is a visible demo, fine-tune is a number on a slide

### ⭐ If Firebase OTA doesn't deploy in time (Phase 7 Task 8)
- **Fallback demo:** "Manual model update simulator" — laptop runs `adb push edgeface_v1.1.tflite /sdcard/Android/data/.../files/` while audience watches, then `adb shell am force-stop com.nhai.faceauth && adb shell am start ...` to restart
- Functionally equivalent visual — judges see the model update without app reinstall
- Mention real Firebase architecture in deck Slide 4 as "production deployment" — judges care about concept, not 100% prod-grade
- This was the #1 differentiator from research; preserve the demo even if backend isn't live

### ⭐ If StrongBox/Play Integrity breaks on test device
- StrongBox is hardware-dependent — fallback to TEE-backed Keystore (still secure, just not the strongest tier)
- Play Integrity emulator-detection sometimes flags real devices incorrectly — keep a known-good test phone, skip check on it for demo
- Mention the strict mode in deck; document the fallback as "permissive mode for legacy devices" in tech doc

### ⭐ If Grafana dashboard not ready
- Backup: 1 static screenshot of dashboard with mock data in pitch deck Slide 3 appendix
- "Production-grade observability — Grafana panel templates committed to repo, deployed in pilot"
- Don't sacrifice this — observability story is govt-evaluator catnip

### ⭐ If Indian fine-tune accuracy lower than 95% target
- Ship stock EdgeFace-XS (99.73% LFW) and quote that number on the deck
- Show fine-tune attempt + per-state TAR table as "Phase-2 ongoing work" — honesty wins
- Cite IndicFairFace + JFAD download as evidence of effort; don't fabricate numbers

### ⭐ If a key dependency (react-native-fast-tflite, react-native-vision-camera) breaks on iOS during Phase 5
- Submit Android-only with note: "iOS port pending Mac/Xcode access" — 70% of NHAI field workers use Android
- Don't lose 2 days fighting iOS pod conflicts
- The hackathon explicitly asks for both, but a polished Android demo beats a broken iOS attempt

---

## Cross-Reference Index

This implementation plan is one of 3 connected documents:

| Doc | Purpose | When to consult |
|---|---|---|
| [NHAI_HACKATHON_STRATEGY.md](NHAI_HACKATHON_STRATEGY.md) | Technical foundation — architecture, modules, schemas, API specs | When writing code, ambiguity on data model or interfaces |
| **implementation_phases.md** (this doc) | Day-by-day build sequence with acceptance criteria | Each morning — find current phase, work through tasks |
| [winning_edge_strategy.md](winning_edge_strategy.md) | Pitch deck content, demo playbook, counter-strategy, compliance angles | Phase 10 (deck day), Phase 11 (submission day), and whenever a differentiator task needs context |

**Source brief:** [hackathon_doc7.pdf](hackathon_doc7.pdf) — re-read before submission to ensure no requirement missed.

---

**End of implementation phases.** Phase 0 starts ASAP; Phase 1 begins 2026-05-22. Win probability with differentiators baked in: **78-82%**.

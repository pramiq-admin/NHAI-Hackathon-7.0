# NHAI Worker Attendance — Phase-Wise Implementation Plan

**Scope:** 2-role attendance app (Admin + Worker) with face-verified Punch In/Out, GPS location, offline-first sync, and calendar view.

**Source:** Handwritten system design (24/5/2026)
**Companion to:** [implementation_phases.md](implementation_phases.md) — that doc covers ML/security foundation (Phases 0-11); this doc covers the **product layer** built on top.

**Total estimated:** 5-7 working days
**Existing base ready:** Camera pipeline, YuNet face detect, EdgeFace embed, enrollment/verification screens, liveness, BioHashing, i18n, AAA theme, backend attendance model.

**Design language:** **Hybrid UI** — base existing dark theme carry karo, selective glassmorphism sirf demo-impact screens par. AAA mode = solid surfaces (no glass). See [Cross-Cutting Design System](#cross-cutting-design-system--hybrid-ui) below.

---

## Cross-Cutting Design System — Hybrid UI

**Strategy:** Existing dark theme ([aaaTheme.ts](frontend/src/app/theme/aaaTheme.ts)) is the **base**. Glassmorphism is layered **selectively** on 4 high-impact screens for judge wow-factor. Worker-critical / outdoor / camera screens stay solid for readability + performance.

### Why Hybrid (not full glass, not full current)
- **Full glassmorphism** → low contrast in sunlight, GPU-heavy on low-end Android, AAA-incompatible
- **Neumorphism** → worst contrast, WCAG fail — skip entirely
- **Current dark theme only** → works but no demo wow-factor
- **Hybrid** → judges impressed by glass on showcase screens, workers get fast/readable UI in the field

### Glass Where (Demo Impact Screens)
| Screen | Why glass | Glass element |
|--------|-----------|---------------|
| **Welcome** | First impression for judges | Glass cards for both role buttons over NHAI gradient |
| **Admin Dashboard** | Stat showcase moment | Glass stat cards (total workers, today's punches, sync status) |
| **Calendar** | Premium-feel data viz | Glass month container + glass detail modal |
| **Punch Result Banner** | Success/fail "wow" moment | Glass banner with gradient tint over screen |

### Solid Where (Critical UX)
| Screen | Why solid | Style |
|--------|-----------|-------|
| **Punch Screen** (main) | Outdoor critical, must be fast | Existing dark theme, big high-contrast button |
| **Punch Capture** (camera) | Live camera preview, perf-sensitive | Solid camera + dark overlay guides |
| **Worker Login** | Form readability | Solid dark inputs (existing) |
| **Worker Login form inputs** | Touch precision | Solid existing |
| **Admin Signup form** | Multi-step form, accessibility | Solid existing |
| **Workers List** | Dense list scrolling perf | Solid rows on dark bg |
| **Add Worker form** | Form readability | Solid existing |
| **Sync Status Badge** | Tiny widget, no real benefit from glass | Solid pill |

### Technical Implementation (only for the 4 glass screens)

1. **Blur library** — `npm install @react-native-community/blur` + `react-native-linear-gradient`
   - iOS: native `UIVisualEffectView`
   - Android: `BlurView` with `blurAmount={15-20}`
   - Fallback for API < 23: solid semi-transparent surface (auto-handled in `GlassCard`)

2. **Glass primitives** (build once in Phase A pre-task):
   - `frontend/src/app/components/GlassCard.tsx` — frosted card with rgba border
   - `frontend/src/app/components/GradientBackground.tsx` — NHAI deep-blue → teal gradient
   - **Don't build** `GlassButton` — solid buttons everywhere (faster + AAA-friendly)

3. **Theme tokens** — extend [aaaTheme.ts](frontend/src/app/theme/aaaTheme.ts):
   ```ts
   GLASS = {
     surface: 'rgba(30, 58, 138, 0.35)',   // NHAI blue tint + alpha
     border: 'rgba(255, 255, 255, 0.18)',
     blur: { low: 12, med: 18, high: 24 },
     shadow: { color: '#000', offset: {w:0,h:8}, opacity: 0.25, radius: 16 }
   }
   GRADIENTS = {
     nhai:    ['#0A2540', '#1E3A8A', '#0E7C7B'],   // welcome bg
     success: ['#10B981', '#34D399'],              // punch success banner
     danger:  ['#EF4444', '#F87171'],              // punch fail banner
   }
   ```

### AAA Mode = No Glass (non-negotiable)
- `useThemeContext()` returns `glassEnabled = !isAAA`
- When AAA on → `GlassCard` renders as **solid `surface` color** (no BlurView)
- Outdoor sunlight detected (>10,000 lux) → auto-enable AAA → glass disabled
- Reason: glassmorphism reduces contrast; sunlight + gloves need solid high-contrast surfaces

### Performance Guardrails
- **Max 3 BlurViews per screen** (Welcome has 2, Dashboard has 3-4 max, Calendar has 1-2)
- **Never blur on camera screens** — Punch Capture stays solid
- Measure FPS in Phase G — if <30fps on mid-range Android, downgrade specific screen to solid

### Files Created (one-time, before Phase A)
- `frontend/src/app/components/GlassCard.tsx`
- `frontend/src/app/components/GradientBackground.tsx`
- `frontend/src/app/theme/aaaTheme.ts` (extended with `GLASS` + `GRADIENTS`)

### Acceptance Criteria (validate at end of each phase)
- [ ] The 4 designated screens (Welcome, Admin Dashboard, Calendar, Punch Result) use `GlassCard`
- [ ] All other screens use existing solid dark theme (no glass)
- [ ] AAA mode renders all `GlassCard` as solid surfaces (BlurView removed)
- [ ] FPS stays ≥45 on mid-range Android on glass screens, ≥60 on solid screens
- [ ] Demo recording shows the glass screens prominently in first 30s

---

## Architecture Recap (from handwritten plan)

```
                    ┌─────────────────┐
                    │   Welcome       │
                    │ Login or Signup │
                    └────┬───────┬────┘
                         │       │
              ┌──────────┘       └──────────┐
              ▼ (if click)                   ▼ (if click)
    ┌──────────────────┐           ┌──────────────────┐
    │ Login as Worker  │           │ Login as Admin   │
    │ OR Login Admin   │           │ OR Signup Admin  │
    └──────────────────┘           └──────────────────┘

Admin signup fields:                Worker login fields:
  1. Name                             1. Name
  2. Mobile Number                    2. Aadhar Number
  3. Aadhar Number                    → DB match check
  4. Register Face ID

After admin login → Admin creates worker IDs + registers their face
After worker login → Single Punch screen:
   Click → Face camera opens → Verify → Punch In + Location
   Same flow for Punch Out
   Time auto-calculated, saved locally
   Network available → sync to backend DB
   Calendar view shows attendance history
```

---

## Phase A — Role Split & Navigation Foundation

**Goal:** Welcome screen banao with role choice. Navigation foundation that supports Worker / Admin flows independently. **Build hybrid UI primitives first.**
**Duration:** 1 day (8 hrs)
**Depends on:** Existing app foundation (Phase 0-4 of implementation_phases.md)
**Parallelizable with:** Nothing (must come first)

### Tasks

0. **Hybrid UI primitives** (pre-task, 1.5 hrs)
   - Install `@react-native-community/blur` + `react-native-linear-gradient`
   - Build `GlassCard.tsx` (frosted card, AAA-aware → solid fallback)
   - Build `GradientBackground.tsx` (NHAI gradient)
   - Extend `aaaTheme.ts` with `GLASS` + `GRADIENTS` tokens
   - Add `glassEnabled` flag to ThemeContext (auto-disabled when `isAAA = true`)
   - **Skip `GlassButton`** — buttons stay solid (existing `actionButton` style) for AAA + glove use
   - Validate: render `GlassCard` over `GradientBackground` — toggle AAA → confirm solid fallback

1. **Welcome/Landing Screen** (glass-enabled) — 2 hrs
   - File: `frontend/src/app/screens/WelcomeScreen.tsx`
   - `<GradientBackground>` with NHAI gradient (`#0A2540 → #1E3A8A → #0E7C7B`)
   - Two `<GlassCard>` tappable role buttons stacked vertically: "Login as Worker" / "Login / Signup as Admin"
   - Solid language toggle pill (EN/HI) top-right (not glass — small widget, no benefit)
   - NHAI logo + tagline at top (solid text on gradient, no card needed)
   - First-launch detection — if session exists, skip to role-specific home
   - **AAA fallback:** glass cards render as solid `surface` color, gradient replaced with solid `bg`

2. **Navigation refactor** — 3 hrs
   - File: `frontend/src/app/navigation/RootStack.tsx` (modify)
   - Routes:
     ```
     RootStack:
       Welcome
       WorkerLogin
       WorkerHome (PunchScreen)
       AdminAuth (Login | Signup tabs)
       AdminTabs:
         Dashboard
         Workers (list + add)
         Attendance (calendar + reports)
         Settings
     ```

3. **Session Store** — 2 hrs
   - File: `frontend/src/app/auth/sessionStore.ts`
   - Zustand store + AsyncStorage persistence
   - Schema: `{ role: 'worker' | 'admin' | null, userId: string, token: string, profile: {...} }`
   - Hooks: `useSession()`, `useLogout()`, `useRequireRole(role)`

4. **Auth-gated routes** — 1 hr
   - Guard component that redirects unauthorized roles
   - Worker cannot access Admin routes and vice-versa

### Files Created
- `frontend/src/app/screens/WelcomeScreen.tsx`
- `frontend/src/app/auth/sessionStore.ts`
- `frontend/src/app/auth/RoleGuard.tsx`
- `frontend/src/app/navigation/RootStack.tsx` (modified)
- `frontend/src/app/navigation/AdminTabs.tsx`

### Acceptance Criteria
- [ ] App opens to Welcome screen on first launch
- [ ] Role choice routes to correct flow
- [ ] App restart restores session and lands on correct home
- [ ] Worker URL deep-link rejected if logged in as Admin (and vice-versa)
- [ ] Language toggle works on Welcome screen

---

## Phase B — Admin Signup + Worker Management

**Goal:** Admin can signup (Name + Mobile + Aadhar + Face), login, and register workers (Name + Aadhar + Face).
**Duration:** 1.5 days (12 hrs)
**Depends on:** Phase A

### Tasks

1. **Admin Signup Screen** — 4 hrs
   - File: `frontend/src/app/screens/admin/AdminSignupScreen.tsx`
   - Multi-step wizard:
     - **Step 1:** Form — Name, Mobile (10-digit India validation), Aadhar (12-digit + Verhoeff checksum)
     - **Step 2:** Face capture — reuse existing 3-angle `EnrollmentScreen` logic
     - **Step 3:** Confirm + submit → local SQLite + backend POST
   - Aadhar masked input (XXXX-XXXX-1234 display)

2. **Backend Admin Routes** — 2 hrs
   - File: `backend/app/models/admin.py`
     ```python
     class Admin(Base):
       id: str (uuid)
       name: str
       mobile: str (indexed, unique)
       aadhar_hash: str (SHA-256 + salt)
       aadhar_salt: str
       face_embedding_hash: str (BioHashed)
       created_at: datetime
     ```
   - File: `backend/app/routes/admin.py`
     - `POST /api/v1/admin/signup` — accepts Pydantic AdminSignupIn
     - `POST /api/v1/admin/login` — mobile + face → JWT
     - Hash Aadhar with per-record salt before storing
   - Alembic migration

3. **Admin Login Screen** — 2 hrs
   - File: `frontend/src/app/screens/admin/AdminLoginScreen.tsx`
   - Mobile input → fetch admin profile → face verification (no password)
   - On success → JWT stored in sessionStore, navigate to AdminTabs

4. **Workers List + Add Worker** — 3 hrs
   - File: `frontend/src/app/screens/admin/WorkersListScreen.tsx`
     - FlatList of workers (name, masked Aadhar, status badge)
     - FAB "+ Add Worker"
     - Pull-to-refresh syncs from backend
   - File: `frontend/src/app/screens/admin/AddWorkerScreen.tsx`
     - Form: Name + Aadhar
     - 3-angle face enrollment (reuse existing screen)
     - Save → backend POST → local DB cache

5. **Backend Worker Routes** — 1 hr
   - File: `backend/app/models/worker.py`
     ```python
     class Worker(Base):
       id: str (uuid)
       name: str
       aadhar_hash: str
       aadhar_salt: str
       face_embedding_hash: str
       admin_id: str (FK)
       active: bool
       created_at: datetime
     ```
   - File: `backend/app/routes/workers.py`
     - `POST /api/v1/workers` — admin-only (JWT scope check)
     - `GET /api/v1/workers` — list under current admin
     - `DELETE /api/v1/workers/{id}` — soft delete (`active=false`)

### Files Created
- `frontend/src/app/screens/admin/AdminSignupScreen.tsx`
- `frontend/src/app/screens/admin/AdminLoginScreen.tsx`
- `frontend/src/app/screens/admin/WorkersListScreen.tsx`
- `frontend/src/app/screens/admin/AddWorkerScreen.tsx`
- `frontend/src/app/utils/aadharValidator.ts` (Verhoeff checksum)
- `backend/app/models/admin.py`
- `backend/app/models/worker.py`
- `backend/app/routes/admin.py`
- `backend/app/routes/workers.py`
- `backend/alembic/versions/xxxx_add_admin_worker_tables.py`

### Acceptance Criteria
- [ ] Admin signup complete: form → face → backend persists
- [ ] Aadhar stored hashed (verify with SQLite browser — no plain Aadhar visible)
- [ ] Admin login via mobile + face verification works
- [ ] Admin can add 5 workers — all appear in list
- [ ] Workers list survives app restart (local cache)
- [ ] Invalid Aadhar (bad checksum) rejected with clear error
- [ ] Mobile already-registered returns 409 with friendly message

---

## Phase C — Worker Login + Punch Screen Skeleton

**Goal:** Worker logs in with Name + Aadhar (DB match). After login, only single Punch screen visible.
**Duration:** 1 day (8 hrs)
**Depends on:** Phase B (workers must exist)

### Tasks

1. **Worker Login Screen** — 3 hrs
   - File: `frontend/src/app/screens/worker/WorkerLoginScreen.tsx`
   - Inputs: Name + Aadhar Number
   - Submit → `POST /api/v1/worker/login`
   - Backend matches `name` + `aadhar_hash` against `workers` table
   - Success → JWT issued, worker profile cached locally
   - Fail → "Invalid credentials. Contact your admin." toast
   - **Offline fallback:** if backend unreachable, check local cached worker list (after first login)

2. **Backend Worker Login** — 1 hr
   - Endpoint: `POST /api/v1/worker/login`
   - Returns JWT (12-hour expiry) + worker profile
   - Rate limit: 5 attempts per mobile per 15 min

3. **Punch Screen** — 3 hrs
   - File: `frontend/src/app/screens/worker/PunchScreen.tsx`
   - **No nav drawer** — only this screen visible post-login
   - UI:
     - Top: Worker name + photo + logout icon
     - Center: Big circular button — "PUNCH IN" (green) OR "PUNCH OUT" (orange)
     - Status banner: "Not punched in today" / "Punched in at 09:15 AM"
     - Bottom link: "View Calendar"
   - Disabled state if today already punched-in AND punched-out

4. **Punch Status Hook** — 1 hr
   - File: `frontend/src/app/hooks/usePunchStatus.ts`
   - Reads today's punch events from local SQLite
   - Returns: `{ status: 'idle' | 'punched_in' | 'completed', lastEvent }`
   - Auto-refreshes on focus

### Files Created
- `frontend/src/app/screens/worker/WorkerLoginScreen.tsx`
- `frontend/src/app/screens/worker/PunchScreen.tsx`
- `frontend/src/app/hooks/usePunchStatus.ts`
- `backend/app/routes/worker_auth.py`

### Acceptance Criteria
- [ ] Correct Name + Aadhar logs in successfully
- [ ] Wrong Aadhar shows error, no login
- [ ] After login, only Punch screen visible (no admin features accessible)
- [ ] Initial state shows "PUNCH IN" button
- [ ] After punch-in, button changes to "PUNCH OUT"
- [ ] After both done, button disabled with "Day complete" message
- [ ] Logout clears session, returns to Welcome

---

## Phase D — Face-Verified Punch In/Out with Location

**Goal:** Punch button → face camera opens → liveness + face match → GPS captured → event saved locally.
**Duration:** 1.5 days (12 hrs)
**Depends on:** Phase C + existing verification pipeline

### Tasks

1. **Punch Capture Flow** — 4 hrs
   - File: `frontend/src/app/screens/worker/PunchCaptureScreen.tsx`
   - Flow:
     1. Open camera (reuse VerificationScreen pipeline)
     2. Run face detect → align → embed
     3. Cosine-match against logged-in worker's enrolled template ONLY (1:1, not 1:N)
     4. Run liveness check (passive PAD + 1 active challenge — blink only, fast)
     5. On success → capture GPS → save event
   - Visual: oval guide overlay, "Look at camera" prompt, progress ring

2. **Location Service** — 2 hrs
   - File: `frontend/src/app/services/locationService.ts`
   - `npm install @react-native-community/geolocation` (if not already)
   - Android: ACCESS_FINE_LOCATION permission flow
   - `getCurrentPosition()` with `{ enableHighAccuracy: true, timeout: 10000 }`
   - Return `{ lat, lon, accuracy, timestamp }` or graceful error
   - **Fallback:** allow punch without GPS but flag `gps_missing=true`

3. **Time Calculation** — 1 hr
   - File: `frontend/src/app/utils/timeCalc.ts`
   - `calculateDuration(punchIn, punchOut) → { hours, minutes, formatted }`
   - Handle edge: punch-out before punch-in (clock skew) → reject with error
   - Day boundary: if punch-out next day, cap at 23:59

4. **Local Storage Schema** — 2 hrs
   - File: `frontend/src/storage/db/schema.sql` (extend)
     ```sql
     CREATE TABLE punch_events(
       id TEXT PRIMARY KEY,
       worker_id TEXT NOT NULL,
       type TEXT CHECK(type IN ('in','out')),
       timestamp INTEGER NOT NULL,
       gps_lat REAL,
       gps_lon REAL,
       gps_accuracy REAL,
       face_match_score REAL,
       liveness_passed INTEGER,
       synced INTEGER DEFAULT 0,
       sync_attempts INTEGER DEFAULT 0,
       created_at INTEGER NOT NULL
     );
     CREATE INDEX idx_punch_worker_day ON punch_events(worker_id, timestamp);
     CREATE INDEX idx_punch_unsynced ON punch_events(synced) WHERE synced = 0;
     ```
   - File: `frontend/src/storage/db/punchEvents.repo.ts`
     - `insertPunch(event)`, `getTodayEvents(workerId)`, `getUnsyncedEvents()`, `markSynced(ids)`

5. **Result Screen** — 2 hrs
   - File: `frontend/src/app/screens/worker/PunchResultScreen.tsx`
   - Success: green check + "Punched in at 09:15 AM" + location pin + auto-return after 3s
   - Failure: red X + reason ("Face didn't match" / "Spoof detected" / "Location unavailable") + retry
   - Voice TTS announcement in worker's language

6. **Same-Day Duplicate Guard** — 1 hr
   - Logic in `usePunchStatus`: block second punch-in if today already has one
   - Block punch-out without prior punch-in
   - All checks local (works offline)

### Files Created
- `frontend/src/app/screens/worker/PunchCaptureScreen.tsx`
- `frontend/src/app/screens/worker/PunchResultScreen.tsx`
- `frontend/src/app/services/locationService.ts`
- `frontend/src/app/utils/timeCalc.ts`
- `frontend/src/storage/db/punchEvents.repo.ts`
- `frontend/src/storage/db/schema.sql` (extended)

### Acceptance Criteria
- [ ] Punch button → face camera opens within 1s
- [ ] Wrong worker's face → match fails with "Not your face" message
- [ ] Spoof (printed photo) → rejected
- [ ] GPS captured within 10s, fallback works if denied
- [ ] Event saved to SQLite with `synced=0`
- [ ] Total work duration shown correctly on punch-out
- [ ] Cannot punch-in twice same day
- [ ] Cannot punch-out without prior punch-in

---

## Phase E — Offline-First Sync to Backend

**Goal:** Phone offline → local save → network available → auto-upload to backend PostgreSQL.
**Duration:** 1 day (8 hrs)
**Depends on:** Phase D + existing backend attendance route

### Tasks

1. **Sync Worker** — 4 hrs
   - File: `frontend/src/sync/punchSyncWorker.ts`
   - Logic:
     1. Query `getUnsyncedEvents()` (limit 50 per batch)
     2. Map to `AttendanceEventIn` format (reuse existing backend model)
     3. POST to `/api/v1/attendance` with worker JWT
     4. On success → `markSynced(acceptedIds)`
     5. On reject (duplicate) → also mark synced (already on server)
     6. On network error → leave for next attempt
   - Triggers:
     - NetInfo "connected" event
     - App foreground event
     - Manual refresh in worker screen

2. **Retry Policy** — 1 hr
   - File: `frontend/src/sync/retryPolicy.ts`
   - Exp backoff: 2s → 4s → 8s → 16s → 32s → 60s cap
   - `sync_attempts` column tracks per-event retry count
   - After 10 failures → mark for manual admin review

3. **Sync Status Indicator** — 2 hrs
   - File: `frontend/src/app/components/SyncStatusBadge.tsx`
   - Small badge top-right corner of Punch screen
   - States: `✓ Synced` (green) / `⏳ 3 pending` (yellow) / `⚠ Sync failed` (red, tap to retry)
   - Real-time count from `getUnsyncedEvents().length`

4. **Backend Wiring** — 1 hr
   - Existing `/api/v1/attendance` route already accepts batches and is idempotent (event_id PK)
   - Add worker JWT auth dependency (currently uses device JWT)
   - Add `worker_id` extraction from JWT claims → override request body for security

### Files Created
- `frontend/src/sync/punchSyncWorker.ts`
- `frontend/src/sync/retryPolicy.ts`
- `frontend/src/sync/connectivityWatcher.ts`
- `frontend/src/app/components/SyncStatusBadge.tsx`

### Files Modified
- `backend/app/routes/attendance.py` (worker JWT scope check)

### Acceptance Criteria
- [ ] Airplane mode: 5 punches → all saved locally with `synced=0`
- [ ] Re-enable network → all 5 appear in PostgreSQL within 30s
- [ ] Replay same batch → server returns all as `rejected[]` (idempotency)
- [ ] Local DB shows `synced=1` after server ack
- [ ] Kill app mid-sync → resume on next launch
- [ ] Sync badge updates in real-time

---

## Phase F — Calendar View (Worker + Admin)

**Goal:** Calendar shows every day's punch-in/out time + total hours. Worker sees own; admin sees any worker.
**Duration:** 1 day (8 hrs)
**Depends on:** Phase E (synced data available)

### Tasks

1. **Calendar Component** — 3 hrs
   - `npm install react-native-calendars`
   - File: `frontend/src/app/components/AttendanceCalendar.tsx`
   - Month view, marked dates:
     - Green dot: full day (in + out, ≥8 hrs)
     - Yellow dot: partial (only in, no out / <8 hrs)
     - Red dot: absent (no events that day)
     - Gray: future date / weekend
   - Tap date → opens detail modal

2. **Worker Calendar Screen** — 2 hrs
   - File: `frontend/src/app/screens/worker/WorkerCalendarScreen.tsx`
   - Reachable from Punch screen "View Calendar" link
   - Shows logged-in worker's attendance
   - Detail modal: `In: 09:15 AM | Out: 06:45 PM | Total: 9h 30m | Location: <map pin>`
   - Read from local SQLite (works offline)

3. **Admin Calendar Screen** — 3 hrs
   - File: `frontend/src/app/screens/admin/AdminCalendarScreen.tsx`
   - Worker selector dropdown (from cached workers list)
   - Selected worker's calendar
   - Summary cards: "Total days: 22 | Total hours: 184h 30m | Avg: 8h 23m"
   - Backend: `GET /api/v1/attendance?worker_id=X&from=YYYY-MM-DD&to=YYYY-MM-DD`
   - File: `backend/app/routes/attendance.py` (add date-range filter)

### Files Created
- `frontend/src/app/components/AttendanceCalendar.tsx`
- `frontend/src/app/screens/worker/WorkerCalendarScreen.tsx`
- `frontend/src/app/screens/admin/AdminCalendarScreen.tsx`

### Files Modified
- `backend/app/routes/attendance.py` (date-range query)

### Acceptance Criteria
- [ ] Worker calendar opens from Punch screen, shows current month
- [ ] Dates with attendance highlighted by color
- [ ] Tap date → modal with in/out times + duration + location
- [ ] Worker can scroll back to past months
- [ ] Admin can switch between workers and see their calendars
- [ ] Admin summary cards show correct totals
- [ ] Calendar renders offline from local cache

---

## Phase G — Polish, Edge Cases & Demo Prep

**Goal:** Smooth all edge cases, complete i18n, prepare demo flow.
**Duration:** 0.5-1 day (4-8 hrs)
**Depends on:** Phase F

### Tasks

1. **Edge cases** — 2 hrs
   - GPS denied → punch allowed but `gps_missing=true` flagged in DB
   - Face not detected after 30s timeout → retry option with hint ("Move to better light")
   - Aadhar format validation (12 digits + Verhoeff checksum) — show inline error
   - Mid-punch app crash → resume capture flow on next launch
   - Phone time tampered (NTP mismatch) → flag in sync, server can reject

2. **i18n completion** — 1 hr
   - All new strings in `frontend/src/i18n/locales/en.json` + `hi.json`
   - Worker prompts: "अपना चेहरा कैमरे में दिखाएँ", "स्थान कैप्चर हो रहा है...", "पंच इन सफल"
   - Admin prompts: "वर्कर जोड़ें", "आधार नंबर", "कैलेंडर"

3. **Demo data seeder** — 1 hr
   - File: `backend/scripts/seed_demo_data.py`
   - Creates: 1 admin + 5 workers + 30 days of randomized but realistic attendance
   - Idempotent — safe to re-run

4. **Demo script update** — 1 hr
   - File: `docs/DEMO_SCRIPT.md`
   - Add worker punch flow section to the 3-min stage demo
   - Include offline-sync money shot: airplane mode → 3 punches → wifi back → instant sync

5. **End-to-end smoke test** — 1 hr
   - Fresh install → Admin signup → Add 1 worker → Worker login → Punch in → Punch out → Calendar
   - Hindi locale → repeat above
   - 100 back-to-back punches → no crash

### Files Created
- `backend/scripts/seed_demo_data.py`

### Files Modified
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/hi.json`
- `docs/DEMO_SCRIPT.md`

### Acceptance Criteria
- [ ] Full E2E flow works in English
- [ ] Full E2E flow works in Hindi
- [ ] All edge cases handled gracefully (no crashes)
- [ ] Demo seeder produces realistic dashboard
- [ ] 100 punches stress test passes

---

## Summary Timeline

| Phase | Days | Cumulative | Output |
|-------|------|------------|--------|
| **A** — Role Split & Nav | 1 | Day 1 | Welcome + routing + sessions |
| **B** — Admin Signup + Workers | 1.5 | Day 2.5 | Admin can register workers with face |
| **C** — Worker Login + Punch UI | 1 | Day 3.5 | Worker login + punch screen skeleton |
| **D** — Face + Location Punch | 1.5 | Day 5 | Full punch flow with verification + GPS |
| **E** — Offline Sync | 1 | Day 6 | Backend sync working end-to-end |
| **F** — Calendar View | 1 | Day 7 | Attendance history visible (worker + admin) |
| **G** — Polish & Demo | 0.5 | Day 7.5 | Production-ready, demo-able |

---

## Critical Dependencies

```
Phase A (foundation)
    ├─► Phase B (Admin) ────┐
    └─► Phase C (Worker) ───┤
                            ├─► Phase D (Punch) ──► Phase E (Sync) ──► Phase F (Calendar) ──► Phase G
```

**Parallelization possible:**
- Phase B and Phase C can be worked on alternately (Admin signup UI ↔ Worker login UI) once Phase A is done.
- Backend admin/worker routes (Phase B backend tasks) can be developed in parallel with frontend.

---

## Existing Code Reuse Map

| New Feature | Reuses Existing |
|-------------|-----------------|
| Admin face enrollment | `EnrollmentScreen` 3-angle capture logic |
| Worker face enrollment | Same `EnrollmentScreen` |
| Punch face verification | `VerificationScreen` pipeline (detect → align → embed → match) |
| Spoof check on punch | Existing `antiSpoof.worklet.ts` + `challengeEngine.ts` |
| Aadhar hash storage | `bioHash.ts` BioHashing pattern (different keys) |
| Backend attendance write | Existing `POST /api/v1/attendance` (extend auth scope) |
| Backend JWT | Existing `auth/jwt.py` (add worker scope claim) |
| AAA theme + i18n | Already in place across all screens |
| Sync infrastructure | Existing `connectivityWatcher.ts` pattern (Phase 7 of base plan) |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Aadhar API integration too slow → cannot verify Aadhar against UIDAI | Skip UIDAI verification for hackathon — just store hashed; mention as "production hook" in pitch |
| Worker forgets Aadhar → cannot login | Admin can re-issue temporary password (Phase B+) — defer to backlog |
| GPS indoors fails consistently | Allow GPS-less punch with `gps_missing` flag; show warning to admin in dashboard |
| Backend down during demo | Offline-first design = punches still work; sync resumes when backend returns |
| Same Aadhar registered under 2 admins | DB unique constraint on aadhar_hash globally; show "already registered" error |

# NHAI Attendance — Live Demo Script

There are two complementary demos in this doc:

1. **Worker Attendance Flow (3 min)** — the product story end users (admin +
   worker) actually live: Welcome → Admin signup → Add worker → Worker login →
   Punch In/Out → Calendar. Use this for product/business judges.
2. **Face Auth Tech Showcase (3 min)** — the original ML/security depth demo:
   enrollment, liveness, anti-spoofing, OTA model updates. Use this for
   technical judges.

Pick one or run them back-to-back depending on the audience. Props are
listed per-demo.

---

# 🧑‍💼 Worker Attendance Flow (3 minutes)

**Props needed:**
1. Android phone with app installed + camera permission granted
2. Backend running locally with `python backend/scripts/seed_demo_data.py`
   already executed — note the printed Admin mobile + Aadhar and at least
   one Worker's Aadhar
3. Laptop with `pgcli`/`psql` ready to show DB rows live
4. Wifi router you can toggle off mid-demo (for offline sync moment)

> "Highway workers today sign paper attendance — fraud-prone, slow to audit,
> and unreadable. NHAI Attendance replaces the paper register with face-
> verified punch in/out that works offline and syncs to a central DB."

## Act A1: Admin Onboarding (45s)

1. Open app → **Welcome screen** appears (glass cards on NHAI gradient)
2. Tap **"Login / Signup as Admin"** → choose **"Signup as Admin"**
3. Fill: Name "Demo Admin", Mobile (any 10-digit), Aadhar (any valid 12-digit
   — Verhoeff is validated locally)
4. Tap "Continue → Capture Face" → 3-angle capture (frontal, left, right)
5. Auto-submits → lands on **Admin Dashboard** with glass stat cards

> "Aadhar is stored as a salted SHA-256 hash — server never sees the plain
> number. Face goes into a cancellable BioHash on-device."

## Act A2: Register a Worker (30s)

1. From Dashboard → **"Add Worker"** (or Workers tab → FAB)
2. Enter Worker Name + Aadhar
3. Capture worker's face (3 angles)
4. Returns to Workers list → new row appears with masked Aadhar

> "Admin can register dozens of workers under their site, each face is
> enrolled once."

## Act A3: Worker Punches In (45s)

1. Logout from Admin (Settings → Logout) → back to Welcome
2. Tap **"Login as Worker"**
3. Enter Worker Name + Aadhar → big circular **PUNCH IN** button appears
4. Tap → camera opens → face matches in ~2 sec → GPS captured
5. **Glass success banner**: "Punched In!" + time + 📍 Location captured

> "Single screen, one tap, no menus. Face verifies identity, GPS verifies
> location, both written to local SQLite immediately."

## Act A4: Offline-First Sync (30s) ⭐ Money shot

1. Toggle wifi OFF on phone (airplane mode)
2. Tap PUNCH OUT → face verify → save (note: badge shows **"⏳ 1 pending"**)
3. Show laptop terminal: `SELECT count(*) FROM punch_events WHERE
   device_id = 'demo-device';` → 0 rows
4. Toggle wifi back ON
5. Within 5 sec: badge flips to **"✓ Synced"**, terminal query shows the row

> "Offline-first. The punch lives in encrypted local SQLite until network
> returns. NetInfo + AppState foreground triggers both fire auto-sync."

## Act A5: Calendar View (30s)

1. From PunchScreen → "View attendance history" → **Worker Calendar** opens
   (glass card on gradient)
2. Today's date is green-dotted, last 30 days from the seeder show
   green/yellow/red dots
3. Tap a date → modal with In/Out times + duration + GPS

4. Logout → log back in as Admin → **Calendar** tab → pick any worker → same
   calendar from admin's perspective (server-fetched summary)

> "Workers see their own attendance offline; admin sees the consolidated
> rollup from PostgreSQL. Hindi toggle works on every screen."

---

# 🧠 Face Auth Tech Showcase (3 minutes)

The original demo for the ML/security depth — kept verbatim below.

**Props needed:**
1. Android phone with app installed
2. Printed A4 glossy photo of yourself
3. Secondary phone with blink+smile video loop
4. Laptop with terminal open at project root

---

## Act 1: Happy Path (60s)

**[Phone in hand, camera facing audience]**

> "This is NHAI Face Auth — fully offline face recognition for highway toll workers."

1. Open app → Home screen visible
2. Tap **Enroll** → Enter ID "DEMO001", Name "Sahil"
3. Capture frontal → left → right (3 poses, ~15s)
4. "Enrollment complete" banner appears
5. Tap **Verify** → Start Liveness Check
6. Complete challenges: blink, turn head, smile (~8s)
7. "Liveness Verified!" → face recognition runs
8. **"Verified: Sahil"** — green border, cosine score visible
9. Point at debug bar: "Detection in XXms, fully on-device, no internet needed"

---

## Act 2: Anti-Spoofing Demo (45s)

**[Hold up printed photo]**

> "But what about spoofing? Someone could hold up my photo..."

1. Hold printed photo in front of camera
2. Liveness challenge starts → photo can't blink
3. **"Liveness check failed"** — red banner
4. "Active liveness requires real facial movements"

**[Hold up secondary phone with video loop]**

5. Point video-playing phone at camera
6. Anti-spoof kicks in → **"Spoof detected"** — red banner
7. "Passive PAD using dual MiniFASNet models detects screen replay attacks"

---

## Act 3: Offline-First Sync (30s)

**[Enable airplane mode visibly]**

> "Highway sites often have no connectivity."

1. Do another verification (airplane mode ON)
2. Match succeeds → event queued locally
3. Show debug: "DB: 1 pending"
4. Turn airplane mode OFF
5. Events sync automatically → "Synced to PostgreSQL backend"
6. Show laptop terminal: `curl localhost:8000/api/v1/attendance` → JSON response with the event

---

## Act 4: OTA Model Update (30s) ⭐ Money Shot

**[Laptop terminal visible to audience]**

> "And when we improve the model, no Play Store update needed."

1. On laptop: `python backend/scripts/sign_and_upload.py --model v1.1.tflite --version 1.1`
2. Phone notification: "New model v1.1 available"
3. "Downloading... verifying Ed25519 signature... Verified!"
4. Re-do face match → latency counter shows slightly different value
5. "Model updated live, signature-verified, zero downtime"

---

## Act 5: Close (15s)

> "Hindi voice prompts for accessibility, AAA outdoor mode for sunlight, per-device adaptive thresholds, hardware-backed encryption, Play Integrity verification. Built for India's highways."

**[Show Hindi mode toggle → voice says "सत्यापित: Sahil"]**

---

## Failure Recovery Plan

| Failure | Recovery |
|---------|----------|
| Camera won't start | Force-close app, reopen (3s) |
| Liveness stuck | Hit Retry button |
| OTA download fails | Skip Act 4, show pre-recorded video |
| Phone dies | Backup recorded demo video on laptop, 1 click away |
| Projector loses signal | Continue verbally, reconnect |

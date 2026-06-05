# NFA (iOS) — NHAI Face Attendance · Flutter

> **iOS companion build** of NFA — NHAI Face Attendance, written in **Flutter**. It mirrors the UI/UX and
> backend contract of the React Native Android app (`../frontend`), which is the **primary, full-pipeline**
> implementation. See the [root README](../README.md) and
> [technical documentation](../NHAI_NFA_Technical_Documentation.pdf) for the full system design.

> ⚠️ **Proprietary — Copyright © 2026 PramIQ Solutions.** Source-available for NHAI Hackathon 7.0 evaluation
> only; **not** open-source. See [LICENSE](../LICENSE).

## What this is

A Flutter port of NFA targeting iOS (and Android), so the same product can ship cross-platform. It reuses the
same screen flows, the same FastAPI / Datalake 3.0 backend, and bundles the same four TFLite models as the RN app.

- **App name:** `nhai_face_auth` · display name **"Nhai Face Auth"** (Info.plist)
- **Flutter SDK:** `^3.12.0`

## ⚠️ Status — UI parity, on-device ML wiring in progress

The **canonical, working pipeline lives in the React Native Android app**. On iOS:

- ✅ **Implemented:** worker onboarding (4-field form → `POST /worker/verify`), enrollment / verification /
  punch / calendar / sync screens, offline sync queue + API client, i18n (EN/HI), voice prompts (`flutter_tts`),
  SQLite storage (`sqflite`), secure storage (`flutter_secure_storage`), GoRouter navigation, GPS service.
- 🛠️ **Scaffolded but not yet wired into the capture screens:** the on-device ML services
  (`lib/ml/embedding_service.dart` for EdgeFace-XS, `lib/ml/anti_spoof_service.dart` for the dual MiniFASNet
  ensemble) exist but are **not yet called** by the punch/enrollment screens. Today:
  - `enrollment_screen.dart` generates a **mock 128-d embedding from face landmarks** (not the EdgeFace 512-d
    TFLite model) — see the in-code note *"In production, this would use the TFLite face embedding model."*
  - `punch_capture_screen.dart` uses a **simulated GPS** and a hardcoded `livenessPassed: true`.

Wiring `embedding_service`/`anti_spoof_service` and real GPS/liveness into these capture flows is the remaining
work to reach functional parity with the Android app.

## On-device models (`assets/models/`)

| Model | Role |
|---|---|
| `edgeface_xs_int8.tflite` | 512-d face embedding |
| `minifasnet_v2.tflite` · `minifasnet_v1se.tflite` | passive anti-spoof ensemble |
| `yunet_int8.tflite` | face detection fallback |

## Tech stack

`camera` · `google_mlkit_face_detection` · `tflite_flutter` · `sqflite` · `flutter_secure_storage` ·
`geolocator` · `flutter_tts` · `intl` + `flutter_localizations` (EN/HI) · `provider` (state) · `go_router` (routing).

## Build & run

```bash
flutter pub get
flutter run                 # connected device / simulator
```

> **iPhone `.ipa` builds require macOS + Xcode** (`flutter build ipa`). On Linux this project is built/verified as
> a Flutter **Android** APK; no pre-built `.ipa` is committed. The native iOS project lives under `ios/Runner.xcodeproj`.

## Project layout (`lib/`)

```
lib/
├── main.dart · app_router.dart        # MultiProvider bootstrap + GoRouter routes
├── screens/                           # welcome, enrollment, verification, worker/*, admin/*
├── ml/                                # embedding_service, anti_spoof_service (TFLite — to be wired in)
├── challenges/                        # liveness challenge engine
├── storage/                           # bio_hash, templates/punch repos (sqflite)
├── sync/                              # offline queue + sync worker
└── services/                          # tts_service, location_service, api client
```

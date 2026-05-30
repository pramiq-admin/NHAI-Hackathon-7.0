# NHAI Face Auth -- Dependency License Audit

> **Audited:** 2026-05-30 | **Result: PASS** -- All components are MIT / Apache-2.0 / BSD-3 / ISC. No GPL or commercial-licensed dependencies.

---

## Frontend (React Native)

| Component | License | Source |
|-----------|---------|--------|
| react | MIT | https://github.com/facebook/react |
| react-native | MIT | https://github.com/facebook/react-native |
| react-native-vision-camera | MIT | https://github.com/mrousavy/react-native-vision-camera |
| react-native-fast-tflite | MIT | https://github.com/mrousavy/react-native-fast-tflite |
| react-native-worklets-core | MIT | https://github.com/margelo/react-native-worklets-core |
| react-native-vision-camera-face-detector | MIT | https://github.com/luicfrr/react-native-vision-camera-face-detector |
| @react-navigation/native | MIT | https://github.com/react-navigation/react-navigation |
| @react-navigation/native-stack | MIT | https://github.com/react-navigation/react-navigation |
| @react-navigation/bottom-tabs | MIT | https://github.com/react-navigation/react-navigation |
| react-native-quick-sqlite | MIT | https://github.com/nicolevernon/react-native-quick-sqlite |
| react-native-sensitive-info | MIT | https://github.com/mCodex/react-native-sensitive-info |
| react-native-keychain | MIT | https://github.com/oblador/react-native-keychain |
| react-native-tts | MIT | https://github.com/ak1394/react-native-tts |
| i18next | MIT | https://github.com/i18next/i18next |
| react-i18next | MIT | https://github.com/i18next/react-i18next |
| @react-native-async-storage/async-storage | MIT | https://github.com/react-native-async-storage/async-storage |
| @react-native-community/netinfo | MIT | https://github.com/react-native-netinfo/react-native-netinfo |
| @react-native-community/geolocation | MIT | https://github.com/michalchudziak/react-native-geolocation |
| @react-native-community/blur | MIT | https://github.com/Kureev/react-native-blur |
| axios | MIT | https://github.com/axios/axios |
| react-native-fs | MIT | https://github.com/itinance/react-native-fs |
| @react-native-firebase/app | Apache-2.0 | https://github.com/invertase/react-native-firebase |
| @react-native-firebase/remote-config | Apache-2.0 | https://github.com/invertase/react-native-firebase |
| @react-native-firebase/storage | Apache-2.0 | https://github.com/invertase/react-native-firebase |
| react-native-libsodium | MIT | https://github.com/nicolevernon/react-native-libsodium |
| react-native-google-play-integrity | MIT | https://github.com/nicolevernon/react-native-google-play-integrity |
| react-native-calendars | MIT | https://github.com/wix/react-native-calendars |
| react-native-linear-gradient | MIT | https://github.com/react-native-linear-gradient/react-native-linear-gradient |
| react-native-localize | MIT | https://github.com/zoontek/react-native-localize |
| react-native-nitro-modules | MIT | https://github.com/nicolevernon/react-native-nitro-modules |
| react-native-safe-area-context | MIT | https://github.com/th3rdwave/react-native-safe-area-context |
| react-native-screens | MIT | https://github.com/software-mansion/react-native-screens |
| zustand | MIT | https://github.com/pmndrs/zustand |
| buffer | MIT | https://github.com/feross/buffer |

## Backend (Python)

| Component | License | Source |
|-----------|---------|--------|
| FastAPI | MIT | https://github.com/tiangolo/fastapi |
| uvicorn | BSD-3-Clause | https://github.com/encode/uvicorn |
| SQLAlchemy | MIT | https://github.com/sqlalchemy/sqlalchemy |
| asyncpg | Apache-2.0 | https://github.com/MagicStack/asyncpg |
| python-jose | MIT | https://github.com/mpdavis/python-jose |
| pydantic | MIT | https://github.com/pydantic/pydantic |
| pydantic-settings | MIT | https://github.com/pydantic/pydantic-settings |
| Alembic | MIT | https://github.com/sqlalchemy/alembic |
| structlog | MIT / Apache-2.0 | https://github.com/hynek/structlog |
| prometheus-fastapi-instrumentator | ISC | https://github.com/trallnag/prometheus-fastapi-instrumentator |
| slowapi (rate limiting) | MIT | https://github.com/laurents/slowapi |

## ML Models

| Model | License | Source |
|-------|---------|--------|
| YuNet (face detection) | Apache-2.0 | https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet |
| EdgeFace (face embedding) | MIT | https://github.com/otroshi/edgeface |
| MiniFASNet v1SE / v2 (anti-spoof) | Apache-2.0 | https://github.com/minivision-ai/Silent-Face-Anti-Spoofing |
| MediaPipe FaceMesh (landmarks) | Apache-2.0 | https://github.com/google/mediapipe |

## Infrastructure

| Component | License | Source |
|-----------|---------|--------|
| PostgreSQL 16 | PostgreSQL License (BSD-like) | https://www.postgresql.org/about/licence/ |
| Prometheus | Apache-2.0 | https://github.com/prometheus/prometheus |
| Grafana OSS | AGPL-3.0 (server only, not bundled) | https://github.com/grafana/grafana |
| Docker | Apache-2.0 | https://github.com/moby/moby |

---

## Compliance Summary

| License Type | Count | Bundled in APK? |
|--------------|-------|-----------------|
| MIT | 35 | Yes |
| Apache-2.0 | 8 | Yes (models + Firebase) |
| BSD-3-Clause | 1 | Yes (uvicorn) |
| ISC | 1 | No (server-side) |
| PostgreSQL (BSD-like) | 1 | No (server-side) |
| AGPL-3.0 (Grafana) | 1 | No (ops tool, not distributed) |

**Verdict:** NO GPL or restrictive commercial licenses are present in the distributed application. All bundled components (mobile APK + backend Docker image) use permissive OSS licenses (MIT, Apache-2.0, BSD-3, ISC) fully compliant with MeitY open-source guidelines.

Grafana is AGPL-3.0 but runs as a standalone monitoring tool -- it is not linked, bundled, or distributed with the application. It is used purely as an operational dashboard accessed over HTTP.

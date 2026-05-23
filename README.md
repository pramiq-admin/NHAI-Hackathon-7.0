# NHAI Face Authentication System

On-device face recognition for NHAI highway workforce attendance — offline-first, privacy-preserving, built for Indian demographics.

## Architecture

```
NhaiHackthon-7/
├── frontend/          # React Native (Android + iOS)
│   ├── src/           # TypeScript source
│   └── assets/        # Bundled TFLite models + signing keys
├── backend/           # FastAPI server + ML training/conversion
│   ├── app/           # API routes, models, auth
│   ├── ml/            # Model conversion, fine-tuning, quantization
│   └── dashboards/    # Grafana exports
└── docs/              # Strategy, architecture, pitch deck
```

## Tech Stack

- **Frontend:** React Native + VisionCamera + react-native-fast-tflite
- **Models:** YuNet (detection) + EdgeFace-XS (recognition) + MiniFASNet (anti-spoof)
- **Backend:** FastAPI + PostgreSQL + Firebase (OTA model updates)
- **Security:** SQLCipher + StrongBox/Keystore + BioHashing (ISO/IEC 24745)

## Setup

```bash
# Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install torch torchvision onnx onnxruntime onnx2tf tensorflow opencv-python pillow numpy scikit-learn

# Frontend (after Android Studio + SDK 34 installed)
cd frontend
npm install
npx react-native run-android
```

## License

MIT

"""
Sign a .tflite model with Ed25519 and upload to Firebase Cloud Storage.
Then bump the model_version in Firebase Remote Config.

Usage:
    python sign_and_upload.py \
        --model edgeface_xs_v1.1.tflite \
        --key .keys/model_signing_key.pem \
        --bucket nhai-face-auth.appspot.com \
        --version 1.1
"""

import argparse
import base64
import json
import sys
from pathlib import Path

try:
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    from cryptography.hazmat.primitives import serialization
except ImportError:
    print("pip install cryptography")
    sys.exit(1)


def generate_keypair(key_dir: Path):
    """Generate Ed25519 keypair for model signing."""
    key_dir.mkdir(parents=True, exist_ok=True)
    private_key = Ed25519PrivateKey.generate()

    priv_pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    (key_dir / "model_signing_key.pem").write_bytes(priv_pem)

    pub_pem = private_key.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    (key_dir / "model_signing_pubkey.pem").write_bytes(pub_pem)

    pub_raw = private_key.public_key().public_bytes(
        serialization.Encoding.Raw,
        serialization.PublicFormat.Raw,
    )
    pub_b64 = base64.b64encode(pub_raw).decode()
    print(f"Public key (base64 for app): {pub_b64}")
    print(f"Keys saved to {key_dir}/")
    return private_key


def sign_model(model_path: Path, key_path: Path) -> bytes:
    """Sign model file with Ed25519 private key."""
    key_pem = key_path.read_bytes()
    private_key = serialization.load_pem_private_key(key_pem, password=None)

    model_bytes = model_path.read_bytes()
    signature = private_key.sign(model_bytes)
    return signature


def upload_to_firebase(model_path: Path, sig_path: Path, bucket: str, version: str):
    """Upload model + signature to Firebase Cloud Storage."""
    try:
        from google.cloud import storage

        client = storage.Client()
        bucket_obj = client.bucket(bucket)

        model_blob = bucket_obj.blob(f"models/edgeface_xs_v{version}.tflite")
        model_blob.upload_from_filename(str(model_path))
        model_blob.make_public()

        sig_blob = bucket_obj.blob(f"models/edgeface_xs_v{version}.sig")
        sig_blob.upload_from_filename(str(sig_path))
        sig_blob.make_public()

        print(f"Uploaded: {model_blob.public_url}")
        print(f"Uploaded: {sig_blob.public_url}")
        return model_blob.public_url, sig_blob.public_url
    except ImportError:
        print("google-cloud-storage not installed, skipping upload")
        print("pip install google-cloud-storage")
        return None, None


def main():
    parser = argparse.ArgumentParser(description="Sign and upload TFLite model for OTA")
    parser.add_argument("--model", type=Path, help="Path to .tflite model")
    parser.add_argument("--key", type=Path, default=Path(".keys/model_signing_key.pem"))
    parser.add_argument("--bucket", type=str, default="nhai-face-auth.appspot.com")
    parser.add_argument("--version", type=str, required=True)
    parser.add_argument("--generate-keys", action="store_true", help="Generate new Ed25519 keypair")
    args = parser.parse_args()

    if args.generate_keys:
        generate_keypair(Path(".keys"))
        return

    if not args.model:
        print("--model is required (or use --generate-keys)")
        sys.exit(1)

    if not args.key.exists():
        print(f"Key not found: {args.key}")
        print("Run with --generate-keys first")
        sys.exit(1)

    print(f"Signing {args.model}...")
    signature = sign_model(args.model, args.key)

    sig_path = args.model.with_suffix(".sig")
    sig_b64 = base64.b64encode(signature).decode()
    sig_path.write_text(sig_b64)
    print(f"Signature saved to {sig_path}")

    print(f"\nUploading to Firebase (bucket: {args.bucket})...")
    model_url, sig_url = upload_to_firebase(args.model, sig_path, args.bucket, args.version)

    if model_url:
        print(f"\nUpdate Firebase Remote Config:")
        print(f"  model_version = {args.version}")
        print(f"  model_url = {model_url}")
        print(f"  model_sig_url = {sig_url}")


if __name__ == "__main__":
    main()

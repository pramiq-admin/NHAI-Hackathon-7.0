#!/usr/bin/env python3
"""
Seed test templates into the app's SQLite database.

Generates synthetic face embeddings for testing the recognition pipeline
without needing the enrollment UI. Run this on the server, then push the
database file to the device.

Usage:
    python3 backend/ml/seed_templates.py [--db path/to/nhai_face_auth.db]
"""

import sys
import os
import json
import sqlite3
import numpy as np
import time

DEFAULT_DB = os.path.join(
    os.path.dirname(__file__),
    "..",
    "..",
    "frontend",
    "android",
    "app",
    "src",
    "main",
    "assets",
    "nhai_face_auth.db",
)

EDGEFACE_ONNX = os.path.join(os.path.dirname(__file__), "edgeface_xs.onnx")

TEST_USERS = [
    {"user_id": "user_001", "name": "Test User 1"},
    {"user_id": "user_002", "name": "Test User 2"},
    {"user_id": "user_003", "name": "Test User 3"},
    {"user_id": "user_004", "name": "Sahil"},
    {"user_id": "user_005", "name": "Demo User"},
]


def generate_embedding_from_image(onnx_path: str, image_path: str) -> np.ndarray:
    """Run EdgeFace ONNX on an image file and return 512-d embedding."""
    try:
        import onnxruntime as ort
        import cv2

        session = ort.InferenceSession(onnx_path)
        img = cv2.imread(image_path)
        img = cv2.resize(img, (112, 112))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = img.astype(np.float32) / 255.0
        img = np.transpose(img, (2, 0, 1))  # HWC → CHW
        img = np.expand_dims(img, 0)

        input_name = session.get_inputs()[0].name
        result = session.run(None, {input_name: img})
        emb = result[0].flatten()
        emb = emb / (np.linalg.norm(emb) + 1e-8)
        return emb
    except Exception as e:
        print(f"  ONNX inference failed: {e}")
        return generate_random_embedding()


def generate_random_embedding() -> np.ndarray:
    """Generate a random L2-normalized 512-d embedding for testing."""
    emb = np.random.randn(512).astype(np.float32)
    emb = emb / np.linalg.norm(emb)
    return emb


def generate_id() -> str:
    return f"{int(time.time())}{np.random.randint(100000, 999999)}"


def create_biohash(embedding: np.ndarray, salt: str) -> str:
    """Replicate the JS bioHash logic in Python for seeding."""
    rng_state = 0
    for ch in salt:
        rng_state = (31 * rng_state + ord(ch)) & 0xFFFFFFFF

    def seeded_random():
        nonlocal rng_state
        rng_state ^= (rng_state << 13) & 0xFFFFFFFF
        rng_state ^= (rng_state >> 17)
        rng_state ^= (rng_state << 5) & 0xFFFFFFFF
        return (rng_state & 0xFFFFFFFF) / 4294967296.0

    dim = 512
    matrix = []
    for i in range(dim):
        row = np.zeros(dim)
        for j in range(dim):
            u1 = seeded_random() or 1e-10
            u2 = seeded_random()
            row[j] = np.sqrt(-2 * np.log(u1)) * np.cos(2 * np.pi * u2)

        for k in range(i):
            dot_val = np.dot(row, matrix[k])
            row -= dot_val * matrix[k]

        norm = np.linalg.norm(row)
        if norm > 1e-10:
            row /= norm
        matrix.append(row)

    projected = np.dot(np.array(matrix), embedding)
    bits = "".join("1" if p > 0 else "0" for p in projected)
    return bits


def seed(db_path: str, use_onnx: bool = False, image_dir: str | None = None):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS templates(
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            emb TEXT NOT NULL,
            bio_hash TEXT,
            salt TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )
    """)
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id)"
    )

    for user in TEST_USERS:
        image_path = None
        if image_dir:
            for ext in [".jpg", ".jpeg", ".png"]:
                candidate = os.path.join(image_dir, user["user_id"] + ext)
                if os.path.exists(candidate):
                    image_path = candidate
                    break

        if use_onnx and image_path and os.path.exists(EDGEFACE_ONNX):
            print(f"  {user['name']}: embedding from {image_path}")
            emb = generate_embedding_from_image(EDGEFACE_ONNX, image_path)
        else:
            print(f"  {user['name']}: random embedding (test only)")
            emb = generate_random_embedding()

        emb_list = emb.tolist()
        salt = "".join(
            chr(ord("a") + np.random.randint(0, 26)) for _ in range(32)
        )
        bio_hash = create_biohash(emb, salt)

        template_id = generate_id()
        conn.execute(
            "INSERT OR REPLACE INTO templates (id, user_id, name, emb, bio_hash, salt) VALUES (?, ?, ?, ?, ?, ?)",
            [template_id, user["user_id"], user["name"], json.dumps(emb_list), bio_hash, salt],
        )
        print(f"    → id={template_id}, bio_hash_len={len(bio_hash)}")

    conn.commit()

    count = conn.execute("SELECT COUNT(*) FROM templates").fetchone()[0]
    print(f"\nSeeded {count} templates into {db_path}")
    conn.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed test face templates")
    parser.add_argument("--db", default=DEFAULT_DB, help="SQLite database path")
    parser.add_argument(
        "--images", default=None, help="Directory with face images (user_001.jpg, etc.)"
    )
    parser.add_argument(
        "--onnx", action="store_true", help="Use ONNX model for real embeddings"
    )
    args = parser.parse_args()

    print(f"Seeding templates into: {args.db}")
    seed(args.db, use_onnx=args.onnx, image_dir=args.images)

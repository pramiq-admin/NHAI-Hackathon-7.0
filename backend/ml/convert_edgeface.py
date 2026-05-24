#!/usr/bin/env python3
"""
Convert EdgeFace XS (gamma_06 low-rank) from PyTorch → ONNX → TFLite INT8.

Uses edgeface_xs_gamma_06 (not _q) because PyTorch dynamic quantization
can't be exported to ONNX. onnx2tf handles INT8 quantization instead.

Input:  1x3x112x112 (RGB, normalized to [-1, 1])
Output: 1x512 (face embedding)
"""

import sys
import os
import torch
import numpy as np

EDGEFACE_REPO = os.path.expanduser("~/repos/nhai-references/edgeface")
CHECKPOINT = os.path.join(EDGEFACE_REPO, "checkpoints", "edgeface_xs_gamma_06.pt")
ONNX_PATH = os.path.join(os.path.dirname(__file__), "edgeface_xs.onnx")
TFLITE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "assets", "models")

sys.path.insert(0, EDGEFACE_REPO)
from backbones import get_model


def replace_gelu_with_tanh(module):
    """Replace all nn.GELU with tanh-approximation variant for TFLite compat."""
    for name, child in module.named_children():
        if isinstance(child, torch.nn.GELU):
            setattr(module, name, torch.nn.GELU(approximate="tanh"))
        else:
            replace_gelu_with_tanh(child)


def step1_export_onnx():
    print("[1/2] Loading EdgeFace XS gamma_06...")
    model = get_model("edgeface_xs_gamma_06")
    state_dict = torch.load(CHECKPOINT, map_location="cpu", weights_only=True)
    model.load_state_dict(state_dict)
    replace_gelu_with_tanh(model)
    model.eval()

    dummy = torch.randn(1, 3, 112, 112)
    with torch.no_grad():
        out = model(dummy)
    print(f"  Model output shape: {out.shape}")

    print(f"  Exporting ONNX → {ONNX_PATH}")
    torch.onnx.export(
        model,
        dummy,
        ONNX_PATH,
        input_names=["input"],
        output_names=["embedding"],
        dynamic_axes=None,
        opset_version=17,
        dynamo=False,
    )
    size_mb = os.path.getsize(ONNX_PATH) / 1024 / 1024
    print(f"  ONNX size: {size_mb:.1f} MB")


def step2_convert_tflite():
    import onnx2tf

    print("[2/2] Converting ONNX → TFLite INT8...")
    os.makedirs(TFLITE_DIR, exist_ok=True)

    onnx2tf.convert(
        input_onnx_file_path=ONNX_PATH,
        output_folder_path=os.path.join(TFLITE_DIR, "_edgeface_savedmodel"),
        non_verbose=True,
        copy_onnx_input_output_names_to_tflite=True,
        quant_type="per-channel",
        output_signaturedefs=True,
        custom_input_op_name_np_data_path=[
            ["input", np.random.randn(20, 3, 112, 112).astype(np.float32)],
        ],
    )

    saved_model_dir = os.path.join(TFLITE_DIR, "_edgeface_savedmodel")
    candidates = [
        os.path.join(saved_model_dir, "edgeface_xs_integer_quant.tflite"),
        os.path.join(saved_model_dir, "edgeface_xs_full_integer_quant.tflite"),
    ]

    # Find any tflite file with "int" in name
    tflite_src = None
    for c in candidates:
        if os.path.exists(c):
            tflite_src = c
            break

    if tflite_src is None:
        for f in os.listdir(saved_model_dir):
            if f.endswith(".tflite") and "int" in f.lower():
                tflite_src = os.path.join(saved_model_dir, f)
                break

    # Fallback: any tflite
    if tflite_src is None:
        for f in os.listdir(saved_model_dir):
            if f.endswith(".tflite"):
                tflite_src = os.path.join(saved_model_dir, f)
                break

    if tflite_src is None:
        print("ERROR: No .tflite file found!")
        print("Files in saved_model_dir:", os.listdir(saved_model_dir))
        sys.exit(1)

    dst = os.path.join(TFLITE_DIR, "edgeface_xs_int8.tflite")
    import shutil
    shutil.copy2(tflite_src, dst)
    size_mb = os.path.getsize(dst) / 1024 / 1024
    print(f"  TFLite INT8: {dst}")
    print(f"  Size: {size_mb:.1f} MB")


if __name__ == "__main__":
    step1_export_onnx()
    step2_convert_tflite()
    print("\nDone!")

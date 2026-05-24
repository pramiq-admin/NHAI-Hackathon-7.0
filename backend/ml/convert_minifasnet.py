#!/usr/bin/env python3
"""
Convert MiniFASNet V2 + V1SE anti-spoofing models from PyTorch → TFLite.

Both models:
  Input:  1×3×80×80  (RGB, float32 [0,1])
  Output: 1×3        (softmax: [fake_class0, real, fake_class2])
  label==1 → real face, others → spoof

Weights:
  2.7_80x80_MiniFASNetV2.pth     → minifasnet_v2.tflite
  4_0_0_80x80_MiniFASNetV1SE.pth → minifasnet_v1se.tflite
"""

import sys
import os
import torch
import numpy as np

REFERENCE_REPO = os.path.expanduser(
    "~/repos/nhai-references/Silent-Face-Anti-Spoofing"
)
WEIGHTS_DIR = os.path.join(REFERENCE_REPO, "resources", "anti_spoof_models")
TFLITE_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "frontend", "assets", "models"
)

MODELS = [
    {
        "pth": "2.7_80x80_MiniFASNetV2.pth",
        "factory": "MiniFASNetV2",
        "tflite_name": "minifasnet_v2.tflite",
    },
    {
        "pth": "4_0_0_80x80_MiniFASNetV1SE.pth",
        "factory": "MiniFASNetV1SE",
        "tflite_name": "minifasnet_v1se.tflite",
    },
]

sys.path.insert(0, REFERENCE_REPO)
from src.model_lib.MiniFASNet import MiniFASNetV2, MiniFASNetV1SE

MODEL_FACTORY = {
    "MiniFASNetV2": MiniFASNetV2,
    "MiniFASNetV1SE": MiniFASNetV1SE,
}

CONV6_KERNEL = (5, 5)  # get_kernel(80, 80) = ((80+15)//16, (80+15)//16)


def load_model(model_info):
    pth_path = os.path.join(WEIGHTS_DIR, model_info["pth"])
    factory = MODEL_FACTORY[model_info["factory"]]
    model = factory(conv6_kernel=CONV6_KERNEL, num_classes=3)

    state_dict = torch.load(pth_path, map_location="cpu", weights_only=True)

    first_key = next(iter(state_dict))
    if first_key.startswith("module."):
        from collections import OrderedDict
        state_dict = OrderedDict(
            (k[7:], v) for k, v in state_dict.items()
        )

    model.load_state_dict(state_dict)
    model.eval()
    return model


def convert_to_tflite(model, tflite_name):
    import litert_torch

    print(f"  Converting {tflite_name} → TFLite via litert_torch...")
    os.makedirs(TFLITE_DIR, exist_ok=True)

    dummy = (torch.randn(1, 3, 80, 80),)
    edge_model = litert_torch.convert(model, dummy)

    dst = os.path.join(TFLITE_DIR, tflite_name)
    edge_model.export(dst)

    size_kb = os.path.getsize(dst) / 1024
    print(f"    TFLite: {dst}")
    print(f"    Size: {size_kb:.0f} KB")

    result = edge_model(*dummy)
    print(f"    Test output shape: {result.shape}")
    from scipy.special import softmax
    print(f"    Test output (softmax): {softmax(result[0])}")


if __name__ == "__main__":
    for info in MODELS:
        name = info["factory"]
        print(f"\n[{name}]")

        model = load_model(info)
        with torch.no_grad():
            test_out = model(torch.randn(1, 3, 80, 80))
        print(f"  PyTorch output shape: {test_out.shape}")

        convert_to_tflite(model, info["tflite_name"])

    print("\nDone! Both anti-spoof models converted.")

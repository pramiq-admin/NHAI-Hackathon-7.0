"""
Quantize fine-tuned EdgeFace-XS ONNX model to INT8 TFLite.
Uses litert_torch for conversion (same toolchain as other model conversions).

Usage:
    python quantize_finetuned.py \
        --onnx ~/nhai_face/checkpoints/edgeface_xs_indian.onnx \
        --weights ~/nhai_face/checkpoints/edgeface_xs_indian_best.pt \
        --cal-dir ~/datasets/nhai_merged/val \
        --out ../frontend/assets/models/edgeface_xs_finetuned_int8.tflite
"""

import argparse
import sys
from pathlib import Path

import torch
import torch.nn as nn
import numpy as np
import timm


class LoRaLin(nn.Module):
    def __init__(self, in_features, out_features, rank, bias=True):
        super().__init__()
        self.linear1 = nn.Linear(in_features, rank, bias=False)
        self.linear2 = nn.Linear(rank, out_features, bias=bias)

    def forward(self, x):
        return self.linear2(self.linear1(x))


def replace_linear_with_lowrank(model, rank_ratio=0.2):
    for name, module in model.named_children():
        if isinstance(module, nn.Linear) and 'head' not in name:
            in_f, out_f = module.in_features, module.out_features
            rank = max(2, int(min(in_f, out_f) * rank_ratio))
            setattr(model, name, LoRaLin(in_f, out_f, rank, bias=module.bias is not None))
        else:
            replace_linear_with_lowrank(module, rank_ratio)
    return model


def build_edgeface_xs():
    model = timm.create_model('edgenext_x_small')
    model.reset_classifier(512)
    model = replace_linear_with_lowrank(model, rank_ratio=0.6)
    return model


def load_calibration_images(cal_dir: Path, n: int = 200) -> list[np.ndarray]:
    """Load n images from calibration dir, return as list of [1,3,112,112] float32 arrays."""
    from PIL import Image
    from torchvision import transforms

    transform = transforms.Compose([
        transforms.Resize(128),
        transforms.CenterCrop(112),
        transforms.ToTensor(),
        transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5]),
    ])

    images = []
    for img_path in sorted(cal_dir.rglob('*')):
        if img_path.suffix.lower() in ('.jpg', '.jpeg', '.png', '.bmp'):
            img = Image.open(img_path).convert('RGB')
            tensor = transform(img).unsqueeze(0).numpy()
            images.append(tensor)
            if len(images) >= n:
                break

    print(f"Loaded {len(images)} calibration images")
    return images


def verify_cosine_error(pt_model, tflite_path: str, cal_images: list[np.ndarray]) -> float:
    """Compare INT8 TFLite outputs against FP32 PyTorch, return mean cosine error."""
    try:
        import tensorflow as tf
    except ImportError:
        print("TensorFlow not available, skipping verification")
        return -1.0

    interpreter = tf.lite.Interpreter(model_path=tflite_path)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    errors = []
    pt_model.eval().cpu()

    for img in cal_images[:50]:
        # PyTorch reference
        with torch.no_grad():
            pt_out = pt_model(torch.from_numpy(img)).numpy().flatten()
        pt_out = pt_out / (np.linalg.norm(pt_out) + 1e-8)

        # TFLite
        interpreter.set_tensor(input_details[0]['index'], img.astype(np.float32))
        interpreter.invoke()
        tfl_out = interpreter.get_tensor(output_details[0]['index']).flatten()
        tfl_out = tfl_out / (np.linalg.norm(tfl_out) + 1e-8)

        cosine_sim = np.dot(pt_out, tfl_out)
        errors.append(1.0 - cosine_sim)

    mean_err = np.mean(errors)
    print(f"Mean cosine error (FP32 vs INT8): {mean_err:.6f} ({mean_err*100:.4f}%)")
    return mean_err


def main():
    parser = argparse.ArgumentParser(description="Quantize fine-tuned EdgeFace-XS to INT8 TFLite")
    parser.add_argument("--weights", type=Path, required=True, help="Path to best .pt weights")
    parser.add_argument("--cal-dir", type=Path, required=True, help="Calibration images dir (val set)")
    parser.add_argument("--out", type=Path, required=True, help="Output .tflite path")
    parser.add_argument("--n-cal", type=int, default=200, help="Number of calibration images")
    args = parser.parse_args()

    print("Loading model...")
    model = build_edgeface_xs()
    model.load_state_dict(torch.load(args.weights, map_location='cpu'))
    model.eval()

    print("Loading calibration data...")
    cal_images = load_calibration_images(args.cal_dir, args.n_cal)
    if len(cal_images) == 0:
        print("ERROR: No calibration images found")
        sys.exit(1)

    print("Converting to TFLite with litert_torch...")
    try:
        import litert_torch

        dummy_input = torch.randn(1, 3, 112, 112)
        tflite_model = litert_torch.convert(model, dummy_input)

        args.out.parent.mkdir(parents=True, exist_ok=True)
        with open(args.out, 'wb') as f:
            f.write(tflite_model)
        print(f"TFLite model saved to {args.out}")

        file_size = args.out.stat().st_size
        print(f"Model size: {file_size / 1024:.0f} KB")

    except ImportError:
        print("litert_torch not available, falling back to ONNX -> TFLite via tf")
        # Fallback: export ONNX first, then convert
        onnx_path = args.out.with_suffix('.onnx')
        dummy = torch.randn(1, 3, 112, 112)
        torch.onnx.export(model, dummy, str(onnx_path),
                          input_names=['input'], output_names=['embedding'],
                          opset_version=13)
        print(f"ONNX exported to {onnx_path}")

        try:
            import tensorflow as tf
            import onnx
            from onnx_tf.backend import prepare

            onnx_model = onnx.load(str(onnx_path))
            tf_rep = prepare(onnx_model)
            tf_rep.export_graph(str(args.out.with_suffix('')))

            converter = tf.lite.TFLiteConverter.from_saved_model(str(args.out.with_suffix('')))
            converter.optimizations = [tf.lite.Optimize.DEFAULT]

            def representative_dataset():
                for img in cal_images:
                    yield [img.astype(np.float32)]

            converter.representative_dataset = representative_dataset
            converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
            converter.inference_input_type = tf.uint8
            converter.inference_output_type = tf.float32

            tflite_model = converter.convert()
            with open(args.out, 'wb') as f:
                f.write(tflite_model)
            print(f"INT8 TFLite model saved to {args.out}")
        except Exception as e:
            print(f"Fallback conversion failed: {e}")
            sys.exit(1)

    print("\nVerifying quantization quality...")
    verify_cosine_error(model, str(args.out), cal_images)
    print("Done.")


if __name__ == "__main__":
    main()

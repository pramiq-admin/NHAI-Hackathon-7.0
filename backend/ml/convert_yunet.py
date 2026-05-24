"""Convert YuNet ONNX → TFLite INT8 for on-device face detection.

Uses onnx2tf for the conversion. Note: onnx2tf's download_test_image_data()
may fail due to numpy pickle issues — the source is patched to fallback
to random calibration data.

Input:  face_detection_yunet_2023mar.onnx (228 KB, 640x640 input)
Output: yunet_int8.tflite (~132 KB)

Usage:
    source .venv/bin/activate
    python backend/ml/convert_yunet.py
"""

import os
import shutil

ONNX_PATH = os.path.expanduser(
    "~/repos/nhai-references/opencv_zoo/models/face_detection_yunet/"
    "face_detection_yunet_2023mar.onnx"
)
OUTPUT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../frontend/assets/models")
)


def convert():
    import onnx
    import onnx2tf

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    tmp_dir = os.path.join(OUTPUT_DIR, "_yunet_tmp")

    # Validate ONNX
    print("[1/2] Validating ONNX model...")
    model = onnx.load(ONNX_PATH)
    onnx.checker.check_model(model)
    inp = model.graph.input[0]
    print(f"  Input: {inp.name}")
    for out in model.graph.output:
        print(f"  Output: {out.name}")

    # Convert
    print("[2/2] Converting ONNX → TFLite via onnx2tf...")
    onnx2tf.convert(
        input_onnx_file_path=ONNX_PATH,
        output_folder_path=tmp_dir,
        non_verbose=True,
        output_integer_quantized_tflite=True,
        quant_type="per-channel",
    )

    # Copy best quantized model
    final_path = os.path.join(OUTPUT_DIR, "yunet_int8.tflite")
    # Prefer full integer quant, fallback to dynamic range
    for pattern in ["full_integer_quant.tflite", "integer_quant.tflite", "dynamic_range_quant.tflite"]:
        candidates = [f for f in os.listdir(tmp_dir) if f.endswith(pattern)]
        if candidates:
            src = os.path.join(tmp_dir, candidates[0])
            shutil.copy2(src, final_path)
            size_kb = os.path.getsize(final_path) / 1024
            print(f"\nSUCCESS: {candidates[0]} → yunet_int8.tflite ({size_kb:.0f} KB)")
            break

    # Show all generated files
    print("\nAll generated TFLite variants:")
    for f in sorted(os.listdir(tmp_dir)):
        if f.endswith(".tflite"):
            size = os.path.getsize(os.path.join(tmp_dir, f)) / 1024
            print(f"  {f} ({size:.0f} KB)")

    shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    convert()

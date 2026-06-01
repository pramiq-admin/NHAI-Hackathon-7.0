import 'dart:math' as math;
import 'dart:typed_data';

import 'package:tflite_flutter/tflite_flutter.dart';

import 'thresholds.dart';

/// Passive anti-spoofing service using MiniFASNet models.
///
/// Runs two models (v2 and v1-SE) and averages their scores
/// to determine if the face is real or a presentation attack.
class AntiSpoofService {
  static const String _modelV2Path = 'assets/models/minifasnet_v2.tflite';
  static const String _modelV1SEPath = 'assets/models/minifasnet_v1se.tflite';
  static const int _inputSize = 80;

  Interpreter? _interpreterV2;
  Interpreter? _interpreterV1SE;
  bool _isInitialized = false;

  bool get isInitialized => _isInitialized;

  /// Load both TFLite models. Must be called before runAntiSpoof.
  Future<void> initialize() async {
    if (_isInitialized) return;

    final options = InterpreterOptions()..threads = 2;

    _interpreterV2 = await Interpreter.fromAsset(_modelV2Path, options: options);
    _interpreterV1SE = await Interpreter.fromAsset(_modelV1SEPath, options: options);
    _isInitialized = true;
  }

  /// Run anti-spoof inference on an 80x80 RGB face crop.
  ///
  /// Returns a score in [0, 1] where higher = more likely real.
  /// [face80x80] must be a flat RGB byte array of size 80*80*3.
  double runAntiSpoof(Uint8List face80x80) {
    if (!_isInitialized) {
      throw StateError('AntiSpoofService not initialized. Call initialize().');
    }

    assert(
      face80x80.length == _inputSize * _inputSize * 3,
      'Input must be 80x80x3 RGB bytes (${_inputSize * _inputSize * 3} bytes)',
    );

    final input = _prepareInput(face80x80);

    final scoreV2 = _runModel(_interpreterV2!, input);
    final scoreV1SE = _runModel(_interpreterV1SE!, input);

    return (scoreV2 + scoreV1SE) / 2.0;
  }

  /// Determine whether the face is real based on the averaged score.
  bool isReal(double score) => score >= Thresholds.padLive;

  /// Prepare normalized float input from raw bytes.
  List<List<List<List<double>>>> _prepareInput(Uint8List bytes) {
    final input = List.generate(
      1,
      (_) => List.generate(
        _inputSize,
        (y) => List.generate(
          _inputSize,
          (x) {
            final offset = (y * _inputSize + x) * 3;
            return [
              (bytes[offset] / 255.0 - 0.5) / 0.5,     // R normalized
              (bytes[offset + 1] / 255.0 - 0.5) / 0.5, // G normalized
              (bytes[offset + 2] / 255.0 - 0.5) / 0.5, // B normalized
            ];
          },
        ),
      ),
    );
    return input;
  }

  /// Run a single model and extract the "real" probability.
  double _runModel(
    Interpreter interpreter,
    List<List<List<List<double>>>> input,
  ) {
    // Output shape: [1, 2] — [spoof_prob, real_prob]
    final output = List.filled(1 * 2, 0.0).reshape([1, 2]);
    interpreter.run(input, output);

    final scores = output[0] as List;
    // Apply softmax and return "real" score (index 1).
    final expSpoof = _exp(scores[0].toDouble());
    final expReal = _exp(scores[1].toDouble());
    final sum = expSpoof + expReal;
    return expReal / sum;
  }

  double _exp(double x) {
    // Clamped exp to prevent overflow.
    if (x.isNaN) return 0.0;
    if (x > 80) return double.maxFinite;
    if (x < -80) return 0.0;
    return math.exp(x);
  }

  /// Release interpreter resources.
  void dispose() {
    _interpreterV2?.close();
    _interpreterV1SE?.close();
    _interpreterV2 = null;
    _interpreterV1SE = null;
    _isInitialized = false;
  }
}

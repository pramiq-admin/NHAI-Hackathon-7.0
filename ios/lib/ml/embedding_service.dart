import 'dart:math';
import 'dart:typed_data';

import 'package:tflite_flutter/tflite_flutter.dart';

/// Service for extracting 512-d face embeddings using EdgeFace XS (int8).
class EmbeddingService {
  static const String _modelPath = 'assets/models/edgeface_xs_int8.tflite';
  static const int _inputSize = 112;
  static const int _embeddingDim = 512;

  Interpreter? _interpreter;
  bool _isInitialized = false;

  bool get isInitialized => _isInitialized;

  /// Load the TFLite model. Must be called before extractEmbedding.
  Future<void> initialize() async {
    if (_isInitialized) return;

    _interpreter = await Interpreter.fromAsset(
      _modelPath,
      options: InterpreterOptions()..threads = 2,
    );
    _isInitialized = true;
  }

  /// Extract a 512-dimensional L2-normalized embedding from a 112x112 RGB face.
  ///
  /// [faceImage112x112] must be a flat RGB byte array of size 112*112*3.
  List<double> extractEmbedding(Uint8List faceImage112x112) {
    if (!_isInitialized || _interpreter == null) {
      throw StateError('EmbeddingService not initialized. Call initialize().');
    }

    assert(
      faceImage112x112.length == _inputSize * _inputSize * 3,
      'Input must be 112x112x3 RGB bytes (${_inputSize * _inputSize * 3} bytes)',
    );

    // Prepare input tensor: [1, 112, 112, 3] normalized to [-1, 1].
    final input = Float32List(_inputSize * _inputSize * 3);
    for (int i = 0; i < faceImage112x112.length; i++) {
      input[i] = (faceImage112x112[i] / 127.5) - 1.0;
    }
    final inputTensor = input.reshape([1, _inputSize, _inputSize, 3]);

    // Prepare output tensor: [1, 512].
    final output = List.filled(1 * _embeddingDim, 0.0).reshape([1, _embeddingDim]);

    _interpreter!.run(inputTensor, output);

    // Extract and L2-normalize the embedding.
    final raw = List<double>.from(output[0] as List);
    return _l2Normalize(raw);
  }

  /// L2-normalize a vector so its magnitude equals 1.
  List<double> _l2Normalize(List<double> vector) {
    double sumSquares = 0.0;
    for (final v in vector) {
      sumSquares += v * v;
    }
    final magnitude = sqrt(sumSquares);
    if (magnitude < 1e-10) return vector;

    return vector.map((v) => v / magnitude).toList();
  }

  /// Release interpreter resources.
  void dispose() {
    _interpreter?.close();
    _interpreter = null;
    _isInitialized = false;
  }
}

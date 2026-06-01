import 'dart:typed_data';
import 'dart:ui' show Offset, Size;

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:image/image.dart' as img;

import '../storage/vector_match.dart';
import 'anti_spoof_service.dart';
import 'embedding_service.dart';
import 'face_align.dart';
import 'face_detector_service.dart';
import 'thresholds.dart';

export '../storage/vector_match.dart' show MatchResult;

/// Pipeline processing stage.
enum PipelineStage {
  idle,
  detecting,
  aligning,
  embedding,
  matching,
  matched,
  noMatch,
}

/// Full pipeline result emitted after each frame.
class PipelineResult {
  final PipelineStage stage;
  final MatchResult? match;
  final double confidence;
  final int latencyMs;
  final DetectedFaceData? faceData;
  final double? antiSpoofScore;

  const PipelineResult({
    required this.stage,
    this.match,
    this.confidence = 0.0,
    this.latencyMs = 0,
    this.faceData,
    this.antiSpoofScore,
  });
}

/// Orchestrates the full face recognition pipeline:
/// detection -> alignment -> embedding -> matching.
class FacePipeline extends ChangeNotifier {
  final FaceDetectorService _faceDetector;
  final EmbeddingService _embeddingService;
  final AntiSpoofService _antiSpoofService;
  final VectorMatch _vectorMatch;

  PipelineResult _lastResult = const PipelineResult(stage: PipelineStage.idle);
  bool _isProcessing = false;

  PipelineResult get lastResult => _lastResult;
  bool get isProcessing => _isProcessing;

  FacePipeline({
    required FaceDetectorService faceDetector,
    required EmbeddingService embeddingService,
    required AntiSpoofService antiSpoofService,
    required VectorMatch vectorMatch,
  })  : _faceDetector = faceDetector,
        _embeddingService = embeddingService,
        _antiSpoofService = antiSpoofService,
        _vectorMatch = vectorMatch;

  /// Initialize all ML services.
  Future<void> initialize() async {
    await _embeddingService.initialize();
    await _antiSpoofService.initialize();
  }

  /// Process a single camera frame through the full pipeline.
  ///
  /// This is designed to be called on each camera frame. If already processing,
  /// the frame will be skipped (non-blocking).
  Future<void> processFrame(CameraImage cameraImage, InputImageRotation rotation) async {
    if (_isProcessing) return;
    _isProcessing = true;

    final stopwatch = Stopwatch()..start();

    try {
      // Stage 1: Face Detection
      _emitResult(const PipelineResult(stage: PipelineStage.detecting));

      final inputImage = _buildInputImage(cameraImage, rotation);
      final faces = await _faceDetector.processImage(inputImage);

      if (faces.isEmpty) {
        _emitResult(PipelineResult(
          stage: PipelineStage.noMatch,
          latencyMs: stopwatch.elapsedMilliseconds,
        ));
        return;
      }

      final face = faces.first;

      // Stage 2: Alignment
      _emitResult(PipelineResult(
        stage: PipelineStage.aligning,
        faceData: face,
      ));

      final landmarks = _extractLandmarks(face);
      if (landmarks == null) {
        _emitResult(PipelineResult(
          stage: PipelineStage.noMatch,
          faceData: face,
          latencyMs: stopwatch.elapsedMilliseconds,
        ));
        return;
      }

      final fullImage = _cameraImageToImg(cameraImage);
      if (fullImage == null) {
        _emitResult(PipelineResult(
          stage: PipelineStage.noMatch,
          faceData: face,
          latencyMs: stopwatch.elapsedMilliseconds,
        ));
        return;
      }

      final alignedFace = alignFaceFromImage(fullImage, face.boundingBox, landmarks);

      // Stage 3: Embedding
      _emitResult(PipelineResult(
        stage: PipelineStage.embedding,
        faceData: face,
      ));

      final embedding = _embeddingService.extractEmbedding(alignedFace);

      // Stage 4: Matching
      _emitResult(PipelineResult(
        stage: PipelineStage.matching,
        faceData: face,
      ));

      final matchResult = await _vectorMatch.findMatch(embedding);

      final latency = stopwatch.elapsedMilliseconds;

      if (matchResult != null) {
        _emitResult(PipelineResult(
          stage: PipelineStage.matched,
          match: matchResult,
          confidence: matchResult.score,
          latencyMs: latency,
          faceData: face,
        ));
      } else {
        _emitResult(PipelineResult(
          stage: PipelineStage.noMatch,
          latencyMs: latency,
          faceData: face,
        ));
      }
    } catch (e) {
      debugPrint('FacePipeline error: $e');
      _emitResult(PipelineResult(
        stage: PipelineStage.noMatch,
        latencyMs: stopwatch.elapsedMilliseconds,
      ));
    } finally {
      stopwatch.stop();
      _isProcessing = false;
    }
  }

  /// Run anti-spoof check on the current face (separate from main pipeline).
  Future<double?> runAntiSpoof(CameraImage cameraImage) async {
    try {
      final fullImage = _cameraImageToImg(cameraImage);
      if (fullImage == null) return null;

      // Resize to 80x80 for anti-spoof models.
      final resized = img.copyResize(fullImage, width: 80, height: 80);
      final bytes = Uint8List(80 * 80 * 3);
      int idx = 0;
      for (int y = 0; y < 80; y++) {
        for (int x = 0; x < 80; x++) {
          final p = resized.getPixel(x, y);
          bytes[idx++] = p.r.toInt();
          bytes[idx++] = p.g.toInt();
          bytes[idx++] = p.b.toInt();
        }
      }

      return _antiSpoofService.runAntiSpoof(bytes);
    } catch (e) {
      debugPrint('AntiSpoof error: $e');
      return null;
    }
  }

  void _emitResult(PipelineResult result) {
    _lastResult = result;
    notifyListeners();
  }

  /// Build an InputImage from CameraImage for ML Kit.
  InputImage _buildInputImage(CameraImage image, InputImageRotation rotation) {
    final plane = image.planes[0];
    return InputImage.fromBytes(
      bytes: plane.bytes,
      metadata: InputImageMetadata(
        size: Size(image.width.toDouble(), image.height.toDouble()),
        rotation: rotation,
        format: InputImageFormat.nv21,
        bytesPerRow: plane.bytesPerRow,
      ),
    );
  }

  /// Extract 5 facial landmarks from detected face data.
  List<Offset>? _extractLandmarks(DetectedFaceData face) {
    final leftEye = face.landmarks[FaceLandmarkType.leftEye];
    final rightEye = face.landmarks[FaceLandmarkType.rightEye];
    final nose = face.landmarks[FaceLandmarkType.noseBase];
    final leftMouth = face.landmarks[FaceLandmarkType.leftMouth];
    final rightMouth = face.landmarks[FaceLandmarkType.rightMouth];

    if (leftEye == null ||
        rightEye == null ||
        nose == null ||
        leftMouth == null ||
        rightMouth == null) {
      return null;
    }

    return [
      Offset(leftEye.position.x.toDouble(), leftEye.position.y.toDouble()),
      Offset(rightEye.position.x.toDouble(), rightEye.position.y.toDouble()),
      Offset(nose.position.x.toDouble(), nose.position.y.toDouble()),
      Offset(leftMouth.position.x.toDouble(), leftMouth.position.y.toDouble()),
      Offset(rightMouth.position.x.toDouble(), rightMouth.position.y.toDouble()),
    ];
  }

  /// Convert CameraImage (NV21/YUV420) to an img.Image for processing.
  img.Image? _cameraImageToImg(CameraImage cameraImage) {
    try {
      final width = cameraImage.width;
      final height = cameraImage.height;

      if (cameraImage.planes.isEmpty) return null;

      // Handle NV21 format (Android).
      if (cameraImage.format.group == ImageFormatGroup.nv21) {
        return _convertNv21(cameraImage.planes[0].bytes, width, height);
      }

      // Handle YUV420 format (iOS).
      if (cameraImage.format.group == ImageFormatGroup.yuv420) {
        return _convertYuv420(cameraImage, width, height);
      }

      // Handle BGRA8888 format (iOS alternative).
      if (cameraImage.format.group == ImageFormatGroup.bgra8888) {
        return _convertBgra8888(cameraImage.planes[0].bytes, width, height);
      }

      return null;
    } catch (e) {
      debugPrint('Image conversion error: $e');
      return null;
    }
  }

  img.Image _convertNv21(Uint8List bytes, int width, int height) {
    final image = img.Image(width: width, height: height);
    final uvStart = width * height;

    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        final yIdx = y * width + x;
        final uvIdx = uvStart + (y ~/ 2) * width + (x & ~1);

        final yVal = bytes[yIdx];
        final vVal = bytes[uvIdx];
        final uVal = bytes[uvIdx + 1];

        final r = (yVal + 1.370705 * (vVal - 128)).clamp(0, 255).toInt();
        final g = (yVal - 0.337633 * (uVal - 128) - 0.698001 * (vVal - 128))
            .clamp(0, 255)
            .toInt();
        final b = (yVal + 1.732446 * (uVal - 128)).clamp(0, 255).toInt();

        image.setPixelRgb(x, y, r, g, b);
      }
    }
    return image;
  }

  img.Image _convertYuv420(CameraImage cameraImage, int width, int height) {
    final yPlane = cameraImage.planes[0];
    final uPlane = cameraImage.planes[1];
    final vPlane = cameraImage.planes[2];

    final image = img.Image(width: width, height: height);

    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        final yVal = yPlane.bytes[y * yPlane.bytesPerRow + x];
        final uvX = x ~/ 2;
        final uvY = y ~/ 2;
        final uVal = uPlane.bytes[uvY * uPlane.bytesPerRow + uvX * (uPlane.bytesPerPixel ?? 1)];
        final vVal = vPlane.bytes[uvY * vPlane.bytesPerRow + uvX * (vPlane.bytesPerPixel ?? 1)];

        final r = (yVal + 1.370705 * (vVal - 128)).clamp(0, 255).toInt();
        final g = (yVal - 0.337633 * (uVal - 128) - 0.698001 * (vVal - 128))
            .clamp(0, 255)
            .toInt();
        final b = (yVal + 1.732446 * (uVal - 128)).clamp(0, 255).toInt();

        image.setPixelRgb(x, y, r, g, b);
      }
    }
    return image;
  }

  img.Image _convertBgra8888(Uint8List bytes, int width, int height) {
    final image = img.Image(width: width, height: height);
    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        final idx = (y * width + x) * 4;
        final b = bytes[idx];
        final g = bytes[idx + 1];
        final r = bytes[idx + 2];
        image.setPixelRgb(x, y, r, g, b);
      }
    }
    return image;
  }

  @override
  void dispose() {
    _faceDetector.dispose();
    _embeddingService.dispose();
    _antiSpoofService.dispose();
    super.dispose();
  }
}

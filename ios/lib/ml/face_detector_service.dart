import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

import 'thresholds.dart';

/// Bounding box record used across the ML layer.
typedef FaceRect = ({double left, double top, double width, double height});

/// Lightweight wrapper around the detected face data we actually use.
class DetectedFaceData {
  final FaceRect boundingBox;
  final double? leftEyeOpenProbability;
  final double? rightEyeOpenProbability;
  final double? smilingProbability;
  final double? headEulerAngleY; // yaw
  final double? headEulerAngleX; // pitch
  final Map<FaceLandmarkType, FaceLandmark?> landmarks;

  const DetectedFaceData({
    required this.boundingBox,
    this.leftEyeOpenProbability,
    this.rightEyeOpenProbability,
    this.smilingProbability,
    this.headEulerAngleY,
    this.headEulerAngleX,
    this.landmarks = const {},
  });

  /// Whether this detection meets minimum confidence.
  bool get isConfident =>
      (smilingProbability != null || leftEyeOpenProbability != null);
}

/// Service that runs Google ML Kit face detection on camera frames.
class FaceDetectorService {
  late final FaceDetector _detector;
  bool _isInitialized = false;

  FaceDetectorService() {
    _detector = FaceDetector(
      options: FaceDetectorOptions(
        enableClassification: true,
        enableLandmarks: true,
        enableTracking: true,
        performanceMode: FaceDetectorMode.fast,
        minFaceSize: 0.15,
      ),
    );
    _isInitialized = true;
  }

  bool get isInitialized => _isInitialized;

  /// Process an [InputImage] and return detected faces filtered by confidence.
  Future<List<DetectedFaceData>> processImage(InputImage inputImage) async {
    final faces = await _detector.processImage(inputImage);

    return faces
        .where((face) =>
            face.trackingId != null ||
            (face.leftEyeOpenProbability ?? 0) > 0 ||
            (face.smilingProbability ?? 0) > 0)
        .map(_mapFace)
        .toList();
  }

  DetectedFaceData _mapFace(Face face) {
    final bbox = face.boundingBox;
    return DetectedFaceData(
      boundingBox: (
        left: bbox.left,
        top: bbox.top,
        width: bbox.width,
        height: bbox.height,
      ),
      leftEyeOpenProbability: face.leftEyeOpenProbability,
      rightEyeOpenProbability: face.rightEyeOpenProbability,
      smilingProbability: face.smilingProbability,
      headEulerAngleY: face.headEulerAngleY,
      headEulerAngleX: face.headEulerAngleX,
      landmarks: {
        FaceLandmarkType.leftEye: face.landmarks[FaceLandmarkType.leftEye],
        FaceLandmarkType.rightEye: face.landmarks[FaceLandmarkType.rightEye],
        FaceLandmarkType.noseBase: face.landmarks[FaceLandmarkType.noseBase],
        FaceLandmarkType.leftMouth:
            face.landmarks[FaceLandmarkType.leftMouth],
        FaceLandmarkType.rightMouth:
            face.landmarks[FaceLandmarkType.rightMouth],
      },
    );
  }

  /// Release resources.
  Future<void> dispose() async {
    if (_isInitialized) {
      await _detector.close();
      _isInitialized = false;
    }
  }
}

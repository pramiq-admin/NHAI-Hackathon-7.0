/// Centralized threshold constants for the ML pipeline.
/// Mirrors the React Native thresholds for consistency across platforms.
class Thresholds {
  Thresholds._();

  /// Minimum confidence from face detector to accept a detection.
  static const double detectionConfidence = 0.7;

  /// Cosine similarity threshold for a positive identity match.
  static const double matchCosine = 0.6;

  /// Passive anti-spoof score threshold — above this is considered real.
  static const double padLive = 0.85;

  /// Minimum Laplacian magnitude for image quality (blur check).
  static const double qualityMagnitude = 18.0;

  /// Cosine threshold during cold-start (fewer enrolled samples).
  static const double adaptiveColdStart = 0.6;

  /// Minimum enrolled samples before using tighter thresholds.
  static const int adaptiveMinSamples = 20;

  /// Eye aspect ratio below which an eye is considered closed.
  static const double earClosed = 0.18;

  /// Eye aspect ratio above which an eye is considered open.
  static const double earOpen = 0.25;

  /// Smile probability threshold to confirm a smile.
  static const double smileThreshold = 0.5;

  /// Yaw angle (degrees) threshold for head turn detection.
  static const double headTurnAngle = 25.0;

  /// Time limit for a single challenge (ms).
  static const int challengeTimeoutMs = 3000;

  /// How long face can be lost before failing the session (ms).
  static const int faceLostTimeoutMs = 2000;
}

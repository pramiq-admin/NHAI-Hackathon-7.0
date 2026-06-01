import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import '../i18n/app_localizations.dart';
import '../theme/app_theme.dart';
import '../theme/colors.dart';
import '../ml/thresholds.dart';
import '../challenges/challenge_engine.dart';
import '../models/template.dart';
import '../storage/templates_repo.dart';
import '../storage/vector_match.dart';
import '../widgets/auth_result_banner.dart';
import '../widgets/liveness_challenge_overlay.dart';

enum VerifyPhase { idle, liveness, verifying, done }

class VerificationScreen extends StatefulWidget {
  const VerificationScreen({super.key});

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  VerifyPhase _phase = VerifyPhase.idle;

  // Camera
  CameraController? _cameraController;
  bool _cameraReady = false;
  bool _cameraPermissionGranted = false;

  // Face detection
  final FaceDetector _faceDetector = FaceDetector(
    options: FaceDetectorOptions(
      enableClassification: true,
      enableLandmarks: true,
      performanceMode: FaceDetectorMode.fast,
      minFaceSize: 0.15,
    ),
  );

  // Liveness challenges
  int _currentChallengeIndex = 0;
  late List<LivenessChallenge> _challenges;
  bool _livenessPassed = false;
  Timer? _challengeTimer;
  int _challengeCountdown = 3;

  // Verification result
  MatchResult? _matchResult;
  bool _spoofDetected = false;
  bool _faceLost = false;
  int _latencyMs = 0;

  // Face lost tracking
  DateTime? _lastFaceSeen;
  Timer? _faceLostTimer;

  // Templates
  final TemplatesRepo _templatesRepo = TemplatesRepo();
  final VectorMatch _vectorMatch = VectorMatch();

  @override
  void initState() {
    super.initState();
    _challenges = _generateChallenges();
    _checkCameraPermission();
    _loadTemplates();
  }

  List<LivenessChallenge> _generateChallenges() {
    return [
      LivenessChallenge(
        type: ChallengeType.blink,
        instruction: 'Please blink',
      ),
      LivenessChallenge(
        type: ChallengeType.headLeft,
        instruction: 'Turn head LEFT',
      ),
      LivenessChallenge(
        type: ChallengeType.headRight,
        instruction: 'Turn head RIGHT',
      ),
    ];
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    _faceDetector.close();
    _challengeTimer?.cancel();
    _faceLostTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadTemplates() async {
    try {
      final templates = await _templatesRepo.getAllTemplates();
      _vectorMatch.setTemplates(templates);
    } catch (_) {}
  }

  Future<void> _checkCameraPermission() async {
    final status = await Permission.camera.status;
    if (status.isGranted) {
      setState(() => _cameraPermissionGranted = true);
      _initCamera();
    } else {
      final result = await Permission.camera.request();
      if (result.isGranted) {
        setState(() => _cameraPermissionGranted = true);
        _initCamera();
      } else {
        setState(() => _cameraPermissionGranted = false);
      }
    }
  }

  Future<void> _initCamera() async {
    final cameras = await availableCameras();
    CameraDescription? frontCamera;
    for (final cam in cameras) {
      if (cam.lensDirection == CameraLensDirection.front) {
        frontCamera = cam;
        break;
      }
    }
    frontCamera ??= cameras.isNotEmpty ? cameras.first : null;
    if (frontCamera == null) return;

    _cameraController = CameraController(
      frontCamera,
      ResolutionPreset.medium,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.nv21,
    );

    try {
      await _cameraController!.initialize();
      if (mounted) {
        setState(() => _cameraReady = true);
      }
    } catch (e) {
      debugPrint('Camera init error: $e');
    }
  }

  void _startLivenessCheck() {
    setState(() {
      _phase = VerifyPhase.liveness;
      _currentChallengeIndex = 0;
      _livenessPassed = false;
      _matchResult = null;
      _spoofDetected = false;
      _faceLost = false;
      _challenges = _generateChallenges();
      _challengeCountdown = (Thresholds.challengeTimeoutMs / 1000).round();
    });
    _startChallengeTimer();
    _startFaceLostMonitor();
  }

  void _startChallengeTimer() {
    _challengeTimer?.cancel();
    _challengeCountdown = (Thresholds.challengeTimeoutMs / 1000).round();
    _challengeTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() => _challengeCountdown--);
      if (_challengeCountdown <= 0) {
        // Auto-advance on timeout (in production, checks face landmarks)
        _onChallengePassed();
      }
    });
  }

  void _startFaceLostMonitor() {
    _lastFaceSeen = DateTime.now();
    _faceLostTimer?.cancel();
    _faceLostTimer = Timer.periodic(const Duration(milliseconds: 500), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_lastFaceSeen != null) {
        final elapsed =
            DateTime.now().difference(_lastFaceSeen!).inMilliseconds;
        if (elapsed > Thresholds.faceLostTimeoutMs && !_faceLost) {
          setState(() => _faceLost = true);
        } else if (elapsed <= Thresholds.faceLostTimeoutMs && _faceLost) {
          setState(() => _faceLost = false);
        }
      }
    });
  }

  void _onChallengePassed() {
    _challengeTimer?.cancel();
    if (_currentChallengeIndex < _challenges.length - 1) {
      setState(() {
        _challenges[_currentChallengeIndex].passed = true;
        _currentChallengeIndex++;
        _challengeCountdown = (Thresholds.challengeTimeoutMs / 1000).round();
      });
      _startChallengeTimer();
    } else {
      // All challenges passed
      setState(() {
        _challenges[_currentChallengeIndex].passed = true;
        _livenessPassed = true;
      });
      _runVerification();
    }
  }

  Future<void> _runVerification() async {
    setState(() => _phase = VerifyPhase.verifying);
    _faceLostTimer?.cancel();

    final startTime = DateTime.now();

    try {
      if (_cameraController == null || !_cameraReady) return;

      // Take a picture for verification
      final image = await _cameraController!.takePicture();
      final inputImage = InputImage.fromFilePath(image.path);
      final faces = await _faceDetector.processImage(inputImage);

      if (faces.isEmpty) {
        setState(() {
          _phase = VerifyPhase.done;
          _faceLost = true;
          _latencyMs = DateTime.now().difference(startTime).inMilliseconds;
        });
        return;
      }

      final face = faces.first;
      _lastFaceSeen = DateTime.now();

      // Anti-spoof check (simplified - in production uses MiniFASNet)
      final spoofScore = _checkAntiSpoof(face);
      if (spoofScore < Thresholds.padLive) {
        setState(() {
          _phase = VerifyPhase.done;
          _spoofDetected = true;
          _latencyMs = DateTime.now().difference(startTime).inMilliseconds;
        });
        return;
      }

      // Generate embedding and match
      final embedding = _generateEmbeddingFromFace(face);
      final match = _vectorMatch.findBestMatch(
        embedding,
        Thresholds.matchCosine,
      );

      setState(() {
        _phase = VerifyPhase.done;
        _matchResult = match;
        _latencyMs = DateTime.now().difference(startTime).inMilliseconds;
      });
    } catch (e) {
      setState(() {
        _phase = VerifyPhase.done;
        _latencyMs = DateTime.now().difference(startTime).inMilliseconds;
      });
    }
  }

  double _checkAntiSpoof(Face face) {
    // Simplified anti-spoof scoring.
    // In production, this uses MiniFASNet TFLite model.
    // Returns a score between 0 and 1 (1 = real).
    final hasLandmarks = face.landmarks.isNotEmpty;
    final hasClassification =
        (face.leftEyeOpenProbability ?? 0) > 0 ||
        (face.smilingProbability ?? 0) > 0;
    final hasBothEyes = face.landmarks[FaceLandmarkType.leftEye] != null &&
        face.landmarks[FaceLandmarkType.rightEye] != null;

    double score = 0.5;
    if (hasLandmarks) score += 0.2;
    if (hasClassification) score += 0.2;
    if (hasBothEyes) score += 0.1;

    return score;
  }

  List<double> _generateEmbeddingFromFace(Face face) {
    // Placeholder: In production, uses EdgeFace TFLite model.
    final random = Random(face.boundingBox.hashCode);
    final embedding = List<double>.generate(128, (i) {
      final base =
          (face.boundingBox.width * face.boundingBox.height) / 100000;
      return (random.nextDouble() - 0.5) + base * 0.01;
    });

    final norm = sqrt(embedding.fold<double>(0, (s, v) => s + v * v));
    if (norm > 0) {
      for (int i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }
    return embedding;
  }

  void _retry() {
    setState(() {
      _phase = VerifyPhase.idle;
      _matchResult = null;
      _spoofDetected = false;
      _faceLost = false;
      _livenessPassed = false;
      _currentChallengeIndex = 0;
      _challenges = _generateChallenges();
    });
  }

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context);
    final themeNotifier = context.watch<ThemeNotifier>();
    final colors =
        themeNotifier.isAAA ? AppColors.aaa : AppColors.normal;

    return Scaffold(
      backgroundColor: colors.bg,
      appBar: AppBar(
        backgroundColor: colors.bg,
        foregroundColor: colors.text,
        title: Text(loc?.t('verify.title') ?? 'Verify Identity'),
        elevation: 0,
      ),
      body: SafeArea(
        child: _cameraPermissionGranted
            ? _buildMainContent(colors, loc)
            : _buildPermissionRequest(colors, loc),
      ),
    );
  }

  Widget _buildMainContent(dynamic colors, AppLocalizations? loc) {
    return Column(
      children: [
        // Camera preview
        Expanded(
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Camera preview
              if (_cameraReady && _cameraController != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: CameraPreview(_cameraController!),
                )
              else
                Center(
                  child: CircularProgressIndicator(color: colors.primary),
                ),

              // Face guide oval
              CustomPaint(
                size: const Size(240, 310),
                painter: _FaceGuideOvalPainter(
                  color: _phase == VerifyPhase.done && _matchResult != null
                      ? colors.success
                      : colors.accent,
                ),
              ),

              // Liveness overlay
              if (_phase == VerifyPhase.liveness)
                LivenessChallengeOverlay(
                  challenge: _challenges[_currentChallengeIndex],
                  countdown: _challengeCountdown,
                  onChallengePassed: _onChallengePassed,
                ),

              // Face lost banner
              if (_faceLost && _phase != VerifyPhase.done)
                Positioned(
                  top: 60,
                  left: 20,
                  right: 20,
                  child: AuthResultBanner(
                    type: BannerType.faceLost,
                    message: loc?.t('liveness.face_lost') ??
                        'Face lost - look at the camera',
                  ),
                ),

              // Verifying spinner
              if (_phase == VerifyPhase.verifying)
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: colors.overlay,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(color: colors.primary),
                      const SizedBox(height: 12),
                      Text(
                        loc?.t('liveness.checking') ??
                            'Verifying liveness...',
                        style: TextStyle(color: colors.text, fontSize: 14),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),

        // Result banner
        if (_phase == VerifyPhase.done) _buildResultArea(colors, loc),

        // Controls
        Padding(
          padding: const EdgeInsets.all(20),
          child: _buildControls(colors, loc),
        ),
      ],
    );
  }

  Widget _buildResultArea(dynamic colors, AppLocalizations? loc) {
    if (_spoofDetected) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        child: AuthResultBanner(
          type: BannerType.spoof,
          message: loc?.t('liveness.spoof_detected') ??
              'Spoof detected - use a real face',
        ),
      );
    }

    if (_matchResult != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        child: AuthResultBanner(
          type: BannerType.verified,
          message: loc?.t('verify.matched',
                  params: {'name': _matchResult!.name}) ??
              'Verified: ${_matchResult!.name}',
          score: _matchResult!.score,
          latencyMs: _latencyMs,
        ),
      );
    }

    if (_faceLost) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        child: AuthResultBanner(
          type: BannerType.faceLost,
          message: loc?.t('verify.no_face_timeout') ??
              'No face detected - please position your face in the frame',
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: AuthResultBanner(
        type: BannerType.noMatch,
        message: loc?.t('verify.no_match') ?? 'Face not recognized',
      ),
    );
  }

  Widget _buildControls(dynamic colors, AppLocalizations? loc) {
    switch (_phase) {
      case VerifyPhase.idle:
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _startLivenessCheck,
            style: ElevatedButton.styleFrom(
              backgroundColor: colors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              loc?.t('liveness.start') ?? 'Start Liveness Check',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        );
      case VerifyPhase.liveness:
        return Text(
          loc?.t('verify.position_face') ??
              'Position your face within the frame',
          style: TextStyle(
            color: colors.textSecondary,
            fontSize: 14,
          ),
          textAlign: TextAlign.center,
        );
      case VerifyPhase.verifying:
        return const SizedBox.shrink();
      case VerifyPhase.done:
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _retry,
            style: ElevatedButton.styleFrom(
              backgroundColor: colors.surface,
              foregroundColor: colors.text,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: colors.border),
              ),
            ),
            child: Text(
              loc?.t('common.retry') ?? 'Retry',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        );
    }
  }

  Widget _buildPermissionRequest(dynamic colors, AppLocalizations? loc) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.camera_alt_outlined,
              size: 64,
              color: colors.textMuted,
            ),
            const SizedBox(height: 20),
            Text(
              loc?.t('common.camera_required') ??
                  'Camera permission is required',
              style: TextStyle(
                color: colors.text,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () async {
                final status = await Permission.camera.request();
                if (status.isGranted) {
                  setState(() => _cameraPermissionGranted = true);
                  _initCamera();
                } else if (status.isPermanentlyDenied) {
                  openAppSettings();
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: colors.accent,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(
                    vertical: 14, horizontal: 28),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                loc?.t('common.grant_permission') ?? 'Grant Camera Access',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FaceGuideOvalPainter extends CustomPainter {
  final Color color;

  _FaceGuideOvalPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;

    final rect = Rect.fromCenter(
      center: Offset(size.width / 2, size.height / 2),
      width: size.width * 0.85,
      height: size.height * 0.9,
    );

    const dashLength = 10.0;
    const gapLength = 6.0;

    final path = Path()..addOval(rect);
    final metrics = path.computeMetrics();

    for (final metric in metrics) {
      double distance = 0;
      bool draw = true;
      while (distance < metric.length) {
        final len = draw ? dashLength : gapLength;
        final end = (distance + len).clamp(0.0, metric.length);
        if (draw) {
          final extractedPath = metric.extractPath(distance, end);
          canvas.drawPath(extractedPath, paint);
        }
        distance = end;
        draw = !draw;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';
import '../../i18n/app_localizations.dart';
import '../../storage/punch_events_repo.dart';
import '../../models/punch_event.dart';

class PunchCaptureScreen extends StatefulWidget {
  final String punchType; // 'in' or 'out'

  const PunchCaptureScreen({super.key, required this.punchType});

  @override
  State<PunchCaptureScreen> createState() => _PunchCaptureScreenState();
}

class _PunchCaptureScreenState extends State<PunchCaptureScreen> {
  final PunchEventsRepo _punchEventsRepo = PunchEventsRepo();

  String _phase = 'detecting'; // detecting, verifying, gps, saving, done, failed
  String? _failReason;
  double _progress = 0;

  @override
  void initState() {
    super.initState();
    _startCapture();
  }

  Future<void> _startCapture() async {
    // Phase 1: Detecting face
    setState(() {
      _phase = 'detecting';
      _progress = 0.1;
    });
    await Future.delayed(const Duration(milliseconds: 800));

    // Phase 2: Verifying
    setState(() {
      _phase = 'verifying';
      _progress = 0.4;
    });
    await Future.delayed(const Duration(milliseconds: 1000));

    // Phase 3: GPS capture
    setState(() {
      _phase = 'gps';
      _progress = 0.7;
    });
    await Future.delayed(const Duration(milliseconds: 600));

    // Phase 4: Saving
    setState(() {
      _phase = 'saving';
      _progress = 0.9;
    });

    try {
      final event = PunchEvent(
        id: const Uuid().v4(),
        type: widget.punchType,
        timestamp: DateTime.now(),
        gpsLat: 28.6139, // Simulated GPS
        gpsLon: 77.2090,
        gpsAccuracy: 5.0,
        faceMatchScore: 0.95,
        livenessPassed: true,
        deviceId: 'device_001',
        synced: 0,
      );

      await _punchEventsRepo.insertPunchEvent(event);

      setState(() {
        _phase = 'done';
        _progress = 1.0;
      });

      await Future.delayed(const Duration(milliseconds: 500));

      if (mounted) {
        context.go('/worker/punch/result?type=${widget.punchType}&success=true');
      }
    } catch (e) {
      setState(() {
        _phase = 'failed';
        _failReason = 'storage_error';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isIn = widget.punchType == 'in';

    return Scaffold(
      backgroundColor: const Color(0xFF0f0f23),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0f0f23),
        elevation: 0,
        title: Text(
          isIn ? l10n.t('punch_capture.title_in') : l10n.t('punch_capture.title_out'),
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 24),

            // Camera preview area (simulated)
            Expanded(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 32),
                decoration: BoxDecoration(
                  color: const Color(0xFF1a1a3e),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: _getPhaseColor(),
                    width: 3,
                  ),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Face outline
                      Container(
                        width: 160,
                        height: 200,
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: _getPhaseColor().withOpacity(0.7),
                            width: 2,
                          ),
                          borderRadius: BorderRadius.circular(80),
                        ),
                        child: Center(
                          child: Icon(
                            _getPhaseIcon(),
                            color: _getPhaseColor(),
                            size: 64,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        _getPhaseText(l10n),
                        style: TextStyle(
                          color: _getPhaseColor(),
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Progress bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Column(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: _progress,
                      backgroundColor: const Color(0xFF334155),
                      valueColor: AlwaysStoppedAnimation<Color>(_getPhaseColor()),
                      minHeight: 6,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _getPhaseSubtext(l10n),
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Retry button if failed
            if (_phase == 'failed') ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () {
                      setState(() {
                        _phase = 'detecting';
                        _progress = 0;
                        _failReason = null;
                      });
                      _startCapture();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF3b82f6),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      l10n.t('common.retry'),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Color _getPhaseColor() {
    switch (_phase) {
      case 'detecting':
        return const Color(0xFF3b82f6);
      case 'verifying':
        return const Color(0xFFf59e0b);
      case 'gps':
        return const Color(0xFF8B5CF6);
      case 'saving':
        return const Color(0xFF10B981);
      case 'done':
        return const Color(0xFF10B981);
      case 'failed':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFF3b82f6);
    }
  }

  IconData _getPhaseIcon() {
    switch (_phase) {
      case 'detecting':
        return Icons.face;
      case 'verifying':
        return Icons.verified_user;
      case 'gps':
        return Icons.location_on;
      case 'saving':
        return Icons.save;
      case 'done':
        return Icons.check_circle;
      case 'failed':
        return Icons.error;
      default:
        return Icons.face;
    }
  }

  String _getPhaseText(AppLocalizations l10n) {
    switch (_phase) {
      case 'detecting':
        return l10n.t('punch_capture.look');
      case 'verifying':
        return l10n.t('punch_capture.hold');
      case 'gps':
        return l10n.t('punch_capture.gps');
      case 'saving':
        return l10n.t('punch_capture.saving');
      case 'done':
        return widget.punchType == 'in'
            ? l10n.t('punch_capture.success_in')
            : l10n.t('punch_capture.success_out');
      case 'failed':
        return _getFailText(l10n);
      default:
        return '';
    }
  }

  String _getPhaseSubtext(AppLocalizations l10n) {
    switch (_phase) {
      case 'detecting':
        return widget.punchType == 'in'
            ? l10n.t('punch_capture.prompt_in')
            : l10n.t('punch_capture.prompt_out');
      case 'verifying':
        return 'Matching face with enrolled profile...';
      case 'gps':
        return 'Getting your location...';
      case 'saving':
        return 'Recording punch event...';
      case 'done':
        return 'Redirecting...';
      case 'failed':
        return 'Tap retry to try again';
      default:
        return '';
    }
  }

  String _getFailText(AppLocalizations l10n) {
    switch (_failReason) {
      case 'face_mismatch':
        return l10n.t('punch_capture.face_mismatch');
      case 'timeout':
        return l10n.t('punch_capture.timeout');
      case 'no_face':
        return l10n.t('punch_capture.no_face');
      case 'spoof':
        return l10n.t('punch_capture.spoof');
      case 'storage_error':
        return l10n.t('punch_capture.storage_error');
      default:
        return 'Verification failed';
    }
  }
}

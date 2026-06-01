import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../i18n/app_localizations.dart';

class PunchResultScreen extends StatelessWidget {
  final String punchType; // 'in' or 'out'
  final bool success;
  final String? failReason;

  const PunchResultScreen({
    super.key,
    required this.punchType,
    required this.success,
    this.failReason,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isIn = punchType == 'in';
    final now = DateTime.now();
    final timeStr = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

    return Scaffold(
      backgroundColor: const Color(0xFF0f0f23),
      body: SafeArea(
        child: InkWell(
          onTap: () => context.go('/worker/punch'),
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Status icon
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: success
                        ? const Color(0xFF10B981).withOpacity(0.15)
                        : const Color(0xFFEF4444).withOpacity(0.15),
                    border: Border.all(
                      color: success
                          ? const Color(0xFF10B981)
                          : const Color(0xFFEF4444),
                      width: 3,
                    ),
                  ),
                  child: Icon(
                    success ? Icons.check_circle : Icons.error,
                    color: success
                        ? const Color(0xFF10B981)
                        : const Color(0xFFEF4444),
                    size: 64,
                  ),
                ),
                const SizedBox(height: 32),

                // Result text
                Text(
                  success
                      ? (isIn
                          ? l10n.t('punch_result.success_in')
                          : l10n.t('punch_result.success_out'))
                      : l10n.t('punch_result.failed'),
                  style: TextStyle(
                    color: success
                        ? const Color(0xFF10B981)
                        : const Color(0xFFEF4444),
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 24),

                if (success) ...[
                  // Time
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1a1a3e),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Column(
                      children: [
                        // Time row
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Time',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                            ),
                            Text(
                              timeStr,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        const Divider(color: Color(0xFF334155)),
                        const SizedBox(height: 12),

                        // Type row
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Type',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: isIn
                                    ? const Color(0xFF10B981).withOpacity(0.15)
                                    : const Color(0xFFf59e0b).withOpacity(0.15),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                isIn ? 'PUNCH IN' : 'PUNCH OUT',
                                style: TextStyle(
                                  color: isIn
                                      ? const Color(0xFF10B981)
                                      : const Color(0xFFf59e0b),
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        const Divider(color: Color(0xFF334155)),
                        const SizedBox(height: 12),

                        // Location row
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Location',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                            ),
                            Row(
                              children: [
                                const Icon(
                                  Icons.check_circle,
                                  color: Color(0xFF10B981),
                                  size: 16,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  l10n.t('punch_result.gps_ok'),
                                  style: const TextStyle(
                                    color: Color(0xFF10B981),
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        const Divider(color: Color(0xFF334155)),
                        const SizedBox(height: 12),

                        // Sync status
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Sync',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                            ),
                            Row(
                              children: [
                                const Icon(
                                  Icons.cloud_upload,
                                  color: Color(0xFFf59e0b),
                                  size: 16,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  l10n.t('punch_result.synced_later'),
                                  style: const TextStyle(
                                    color: Color(0xFFf59e0b),
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  // Failure reason
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.3)),
                    ),
                    child: Text(
                      _getFailReasonText(l10n),
                      style: const TextStyle(
                        color: Color(0xFFEF4444),
                        fontSize: 15,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
                const SizedBox(height: 40),

                // Done button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () => context.go('/worker/punch'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF3b82f6),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: Text(
                      l10n.t('punch_result.tap_to_return'),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _getFailReasonText(AppLocalizations l10n) {
    switch (failReason) {
      case 'face':
        return l10n.t('punch_result.r_face');
      case 'timeout':
        return l10n.t('punch_result.r_timeout');
      case 'spoof':
        return l10n.t('punch_result.r_spoof');
      default:
        return l10n.t('punch_result.r_generic');
    }
  }
}

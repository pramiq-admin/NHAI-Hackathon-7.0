import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../i18n/app_localizations.dart';
import '../theme/app_theme.dart';
import '../theme/colors.dart';
import '../sync/sync_worker.dart';
import '../sync/api_client.dart';
import '../storage/punch_events_repo.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _pendingCount = 0;
  bool _isSyncing = false;
  final PunchEventsRepo _punchRepo = PunchEventsRepo();
  late final SyncWorker _syncWorker;

  @override
  void initState() {
    super.initState();
    _syncWorker = SyncWorker(ApiClient());
    _loadPendingCount();
  }

  Future<void> _loadPendingCount() async {
    try {
      final syncQueueSize = await _syncWorker.getQueueSize();
      final punchPending = await _punchRepo.getUnsyncedCount();
      if (mounted) {
        setState(() {
          _pendingCount = syncQueueSize + punchPending;
        });
      }
    } catch (_) {
      // DB may not be initialized yet
    }
  }

  Future<void> _handleSync() async {
    setState(() => _isSyncing = true);

    try {
      final result = await _syncWorker.syncPendingEvents();

      // Also sync punch events
      final punchEvents = await _punchRepo.getUnsyncedEvents(50);
      int punchSynced = 0;
      if (punchEvents.isNotEmpty) {
        try {
          final api = ApiClient();
          await api.syncPunchEvents(
            punchEvents.map((e) => e.toMap()).toList(),
          );
          await _punchRepo
              .markSynced(punchEvents.map((e) => e.id).toList());
          punchSynced = punchEvents.length;
        } catch (_) {
          await _punchRepo
              .markSyncFailed(punchEvents.map((e) => e.id).toList());
        }
      }

      final totalSynced = result.synced + punchSynced;
      final totalFailed = result.failed;

      await _loadPendingCount();

      if (mounted) {
        final loc = AppLocalizations.of(context);
        String message;
        if (totalSynced > 0 && totalFailed == 0) {
          message = loc?.t('sync.success',
                  params: {'count': totalSynced.toString()}) ??
              '$totalSynced events synced successfully';
        } else if (totalSynced > 0 && totalFailed > 0) {
          message = loc?.t('sync.partial',
                  params: {'count': totalSynced.toString()}) ??
              'Partially synced - $totalSynced sent, some failed';
        } else if (_pendingCount == 0) {
          message = loc?.t('sync.up_to_date') ?? 'All data synced';
        } else {
          message = loc?.t('sync.error') ??
              'Sync failed - check your network connection';
        }
        _showAlert(message);
      }
    } catch (e) {
      if (mounted) {
        final loc = AppLocalizations.of(context);
        _showAlert(loc?.t('sync.error') ??
            'Sync failed - check your network connection');
      }
    } finally {
      if (mounted) {
        setState(() => _isSyncing = false);
      }
    }
  }

  void _showAlert(String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(AppLocalizations.of(context)?.t('sync.title') ?? 'Sync'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context);
    final themeNotifier = context.watch<ThemeNotifier>();
    final colors =
        themeNotifier.isAAA ? AppColors.aaa : AppColors.normal;

    return Scaffold(
      backgroundColor: colors.bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header band
              _buildHeader(colors, loc),
              const SizedBox(height: 24),
              // Greeting
              _buildGreeting(colors, loc),
              const SizedBox(height: 24),
              // Verify card
              _buildVerifyCard(colors, loc),
              const SizedBox(height: 16),
              // Enroll card
              _buildEnrollCard(colors, loc),
              const SizedBox(height: 20),
              // Sync button
              _buildSyncButton(colors, loc),
              const SizedBox(height: 20),
              // Admin pill
              _buildAdminPill(colors, loc),
              const SizedBox(height: 24),
              // Feature badges
              _buildFeatureBadges(colors),
              const SizedBox(height: 16),
              // Version text
              _buildVersionText(colors),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(dynamic colors, AppLocalizations? loc) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: colors.border),
      ),
      child: Row(
        children: [
          // NFA Logo circle with orange border
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: colors.accent, width: 2),
              color: colors.bg,
            ),
            child: Center(
              child: Text(
                'NFA',
                style: TextStyle(
                  color: colors.accent,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'NHAI Face Auth',
                  style: TextStyle(
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  loc?.t('home.subtitle') ??
                      'National Highways Authority of India',
                  style: TextStyle(
                    color: colors.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGreeting(dynamic colors, AppLocalizations? loc) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'नमस्ते 🙏',
          style: TextStyle(
            color: colors.text,
            fontSize: 28,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Worker attendance system',
          style: TextStyle(
            color: colors.textSecondary,
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  Widget _buildVerifyCard(dynamic colors, AppLocalizations? loc) {
    return GestureDetector(
      onTap: () => context.push('/verify'),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: colors.primary,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          boxShadow: [
            BoxShadow(
              color: colors.primary.withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                child: Text(
                  '📸',
                  style: TextStyle(fontSize: 28),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    loc?.t('home.verify') ?? 'Verify',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Tap to verify identity',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios,
              color: Colors.white.withOpacity(0.8),
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEnrollCard(dynamic colors, AppLocalizations? loc) {
    return GestureDetector(
      onTap: () => context.push('/enroll'),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: colors.surface,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: colors.accent, width: 1.5),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: colors.accent.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Center(
                child: Text(
                  '➕',
                  style: TextStyle(fontSize: 22),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    loc?.t('home.enroll') ?? 'Enroll',
                    style: TextStyle(
                      color: colors.text,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Register new worker face',
                    style: TextStyle(
                      color: colors.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios,
              color: colors.textMuted,
              size: 18,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSyncButton(dynamic colors, AppLocalizations? loc) {
    final hasPending = _pendingCount > 0;
    return GestureDetector(
      onTap: _isSyncing ? null : _handleSync,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          color: hasPending
              ? colors.accent.withOpacity(0.15)
              : colors.surface,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(
            color: hasPending ? colors.accent : colors.border,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_isSyncing)
              SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: colors.accent,
                ),
              )
            else
              const Text('🔄', style: TextStyle(fontSize: 18)),
            const SizedBox(width: 10),
            Text(
              loc?.t('sync.button') ?? 'Sync Data',
              style: TextStyle(
                color: hasPending ? colors.accent : colors.text,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (hasPending) ...[
              const SizedBox(width: 10),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: colors.danger,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                child: Text(
                  '$_pendingCount',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAdminPill(dynamic colors, AppLocalizations? loc) {
    return Center(
      child: GestureDetector(
        onTap: () => context.push('/admin'),
        child: Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          decoration: BoxDecoration(
            color: colors.surface,
            borderRadius: BorderRadius.circular(AppRadius.pill),
            border: Border.all(color: colors.border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('⚙️', style: TextStyle(fontSize: 16)),
              const SizedBox(width: 8),
              Text(
                loc?.t('home.admin') ?? 'Admin',
                style: TextStyle(
                  color: colors.textSecondary,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureBadges(dynamic colors) {
    final badges = [
      '✓ Offline',
      '🔒 BioHash',
      '🇮🇳 DPDPA',
    ];

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: badges.map((badge) {
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          padding:
              const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: colors.surface,
            borderRadius: BorderRadius.circular(AppRadius.pill),
            border: Border.all(color: colors.border),
          ),
          child: Text(
            badge,
            style: TextStyle(
              color: colors.textSecondary,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildVersionText(dynamic colors) {
    return Center(
      child: Text(
        'v1.0 • Powered by EdgeFace + ML Kit',
        style: TextStyle(
          color: colors.textMuted,
          fontSize: 11,
        ),
      ),
    );
  }
}

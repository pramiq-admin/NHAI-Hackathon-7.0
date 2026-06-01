import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../i18n/app_localizations.dart';
import '../../storage/templates_repo.dart';
import '../../storage/punch_events_repo.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final TemplatesRepo _templatesRepo = TemplatesRepo();
  final PunchEventsRepo _punchEventsRepo = PunchEventsRepo();

  int _totalWorkers = 0;
  int _todayAttendance = 0;
  double _compliancePercent = 0;
  List<_AttendanceEntry> _recentAttendance = [];
  bool _isLoading = true;
  DateTime _lastRefresh = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isLoading = true);
    try {
      final templates = await _templatesRepo.getAllTemplates();
      final allEvents = await _punchEventsRepo.getAllEvents();

      final today = DateTime.now();
      final todayStr =
          '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

      final todayEvents = allEvents.where((e) {
        final eventDate =
            '${e.timestamp.year}-${e.timestamp.month.toString().padLeft(2, '0')}-${e.timestamp.day.toString().padLeft(2, '0')}';
        return eventDate == todayStr && e.type == 'in';
      }).toList();

      final recentEntries = allEvents.take(10).map((e) {
        final template = templates.where((t) => t.userId == e.deviceId).firstOrNull;
        return _AttendanceEntry(
          name: template?.name ?? 'Worker',
          type: e.type,
          time: e.timestamp,
        );
      }).toList();

      setState(() {
        _totalWorkers = templates.length;
        _todayAttendance = todayEvents.length;
        _compliancePercent = templates.isEmpty
            ? 0
            : (todayEvents.length / templates.length * 100).clamp(0, 100);
        _recentAttendance = recentEntries;
        _isLoading = false;
        _lastRefresh = DateTime.now();
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: const Color(0xFF0f0f23),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0f0f23),
        elevation: 0,
        title: Text(
          l10n.t('admin_dash.tab'),
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings, color: Color(0xFF94A3B8)),
            onPressed: () => context.go('/admin/settings'),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3b82f6)))
          : RefreshIndicator(
              onRefresh: _loadDashboardData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Greeting
                  Text(
                    '${l10n.t('admin_dash.hello')}, Admin',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Stats cards
                  Row(
                    children: [
                      Expanded(
                        child: _buildStatCard(
                          label: l10n.t('admin_dash.total_workers'),
                          value: '$_totalWorkers',
                          icon: Icons.people,
                          color: const Color(0xFF3b82f6),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildStatCard(
                          label: l10n.t('admin_dash.active'),
                          value: '$_todayAttendance',
                          icon: Icons.check_circle,
                          color: const Color(0xFF10B981),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildStatCard(
                          label: 'Compliance',
                          value: '${_compliancePercent.toStringAsFixed(0)}%',
                          icon: Icons.trending_up,
                          color: const Color(0xFFf59e0b),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Quick actions
                  Text(
                    l10n.t('admin_dash.quick_actions'),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildActionButton(
                          icon: Icons.person_add,
                          label: l10n.t('admin_dash.add_worker'),
                          color: const Color(0xFF3b82f6),
                          onTap: () => context.go('/admin/workers/add'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildActionButton(
                          icon: Icons.people,
                          label: l10n.t('admin_dash.view_workers'),
                          color: const Color(0xFF10B981),
                          onTap: () => context.go('/admin/workers'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildActionButton(
                          icon: Icons.calendar_month,
                          label: l10n.t('admin_dash.attendance'),
                          color: const Color(0xFFf59e0b),
                          onTap: () => context.go('/admin/calendar'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildActionButton(
                          icon: Icons.settings,
                          label: l10n.t('admin_dash.settings'),
                          color: const Color(0xFF8B5CF6),
                          onTap: () => context.go('/admin/settings'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // System status
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1a1a3e),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: const BoxDecoration(
                            color: Color(0xFF10B981),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                l10n.t('admin_dash.system_status'),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                l10n.t('admin_dash.online'),
                                style: const TextStyle(
                                  color: Color(0xFF10B981),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '${l10n.t('admin_dash.last_refresh')}: ${_lastRefresh.hour}:${_lastRefresh.minute.toString().padLeft(2, '0')}',
                          style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Recent attendance
                  Text(
                    'Recent Attendance',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_recentAttendance.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1a1a3e),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                        child: Text(
                          'No attendance records yet',
                          style: TextStyle(color: Color(0xFF94A3B8)),
                        ),
                      ),
                    )
                  else
                    ..._recentAttendance.map(_buildAttendanceItem),
                ],
              ),
            ),
    );
  }

  Widget _buildStatCard({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1a1a3e),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttendanceItem(_AttendanceEntry entry) {
    final isIn = entry.type == 'in';
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1a1a3e),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: isIn ? const Color(0xFF10B981) : const Color(0xFFf59e0b),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              entry.name,
              style: const TextStyle(color: Colors.white, fontSize: 14),
            ),
          ),
          Text(
            isIn ? 'IN' : 'OUT',
            style: TextStyle(
              color: isIn ? const Color(0xFF10B981) : const Color(0xFFf59e0b),
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(width: 12),
          Text(
            '${entry.time.hour}:${entry.time.minute.toString().padLeft(2, '0')}',
            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _AttendanceEntry {
  final String name;
  final String type;
  final DateTime time;

  _AttendanceEntry({
    required this.name,
    required this.type,
    required this.time,
  });
}

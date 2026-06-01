import 'package:flutter/material.dart';
import '../../i18n/app_localizations.dart';
import '../../storage/templates_repo.dart';
import '../../storage/punch_events_repo.dart';
import '../../models/template.dart';
import '../../models/punch_event.dart';

class AdminCalendarScreen extends StatefulWidget {
  const AdminCalendarScreen({super.key});

  @override
  State<AdminCalendarScreen> createState() => _AdminCalendarScreenState();
}

class _AdminCalendarScreenState extends State<AdminCalendarScreen> {
  final TemplatesRepo _templatesRepo = TemplatesRepo();
  final PunchEventsRepo _punchEventsRepo = PunchEventsRepo();

  List<FaceTemplate> _workers = [];
  FaceTemplate? _selectedWorker;
  DateTime _currentMonth = DateTime.now();
  Map<int, _DayStatus> _dayStatuses = {};
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadWorkers();
  }

  Future<void> _loadWorkers() async {
    setState(() => _isLoading = true);
    try {
      final workers = await _templatesRepo.getAllTemplates();
      setState(() {
        _workers = workers;
        _isLoading = false;
        if (workers.isNotEmpty && _selectedWorker == null) {
          _selectedWorker = workers.first;
          _loadAttendanceForMonth();
        }
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadAttendanceForMonth() async {
    if (_selectedWorker == null) return;

    final allEvents = await _punchEventsRepo.getAllEvents();
    final workerEvents = allEvents
        .where((e) => e.deviceId == _selectedWorker!.userId)
        .toList();

    final Map<int, _DayStatus> statuses = {};
    final daysInMonth = DateTime(_currentMonth.year, _currentMonth.month + 1, 0).day;

    for (int day = 1; day <= daysInMonth; day++) {
      final date = DateTime(_currentMonth.year, _currentMonth.month, day);
      if (date.isAfter(DateTime.now())) continue;

      final dayEvents = workerEvents.where((e) {
        return e.timestamp.year == date.year &&
            e.timestamp.month == date.month &&
            e.timestamp.day == date.day;
      }).toList();

      if (dayEvents.isEmpty) {
        statuses[day] = _DayStatus.absent;
      } else {
        final hasIn = dayEvents.any((e) => e.type == 'in');
        final hasOut = dayEvents.any((e) => e.type == 'out');
        if (hasIn && hasOut) {
          statuses[day] = _DayStatus.full;
        } else {
          statuses[day] = _DayStatus.partial;
        }
      }
    }

    setState(() => _dayStatuses = statuses);
  }

  void _previousMonth() {
    setState(() {
      _currentMonth = DateTime(_currentMonth.year, _currentMonth.month - 1);
    });
    _loadAttendanceForMonth();
  }

  void _nextMonth() {
    setState(() {
      _currentMonth = DateTime(_currentMonth.year, _currentMonth.month + 1);
    });
    _loadAttendanceForMonth();
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
          l10n.t('admin_cal.title'),
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3b82f6)))
          : _workers.isEmpty
              ? Center(
                  child: Text(
                    l10n.t('admin_cal.empty'),
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 16),
                  ),
                )
              : Column(
                  children: [
                    // Worker dropdown
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1a1a3e),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF334155)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<FaceTemplate>(
                            value: _selectedWorker,
                            isExpanded: true,
                            dropdownColor: const Color(0xFF1a1a3e),
                            style: const TextStyle(color: Colors.white),
                            hint: Text(
                              l10n.t('admin_cal.pick_worker'),
                              style: const TextStyle(color: Color(0xFF64748B)),
                            ),
                            items: _workers.map((w) {
                              return DropdownMenuItem(
                                value: w,
                                child: Text(w.name),
                              );
                            }).toList(),
                            onChanged: (w) {
                              setState(() => _selectedWorker = w);
                              _loadAttendanceForMonth();
                            },
                          ),
                        ),
                      ),
                    ),

                    // Month navigation
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.chevron_left, color: Colors.white),
                            onPressed: _previousMonth,
                          ),
                          Text(
                            _monthYearString(_currentMonth),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.chevron_right, color: Colors.white),
                            onPressed: _nextMonth,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Weekday headers
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: ['M', 'T', 'W', 'T', 'F', 'S', 'S']
                            .map((d) => SizedBox(
                                  width: 40,
                                  child: Center(
                                    child: Text(
                                      d,
                                      style: const TextStyle(
                                        color: Color(0xFF94A3B8),
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ))
                            .toList(),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Calendar grid
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: _buildCalendarGrid(),
                      ),
                    ),

                    // Legend
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildLegendItem(
                            const Color(0xFF10B981),
                            l10n.t('calendar.legend_full'),
                          ),
                          _buildLegendItem(
                            const Color(0xFFf59e0b),
                            l10n.t('calendar.legend_partial'),
                          ),
                          _buildLegendItem(
                            const Color(0xFFEF4444),
                            l10n.t('calendar.legend_absent'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildCalendarGrid() {
    final firstDay = DateTime(_currentMonth.year, _currentMonth.month, 1);
    final daysInMonth = DateTime(_currentMonth.year, _currentMonth.month + 1, 0).day;
    final startWeekday = firstDay.weekday; // 1=Mon, 7=Sun

    final List<Widget> cells = [];

    // Empty cells before first day
    for (int i = 1; i < startWeekday; i++) {
      cells.add(const SizedBox(width: 40, height: 40));
    }

    // Day cells
    for (int day = 1; day <= daysInMonth; day++) {
      final status = _dayStatuses[day];
      Color? bgColor;
      if (status == _DayStatus.full) {
        bgColor = const Color(0xFF10B981);
      } else if (status == _DayStatus.partial) {
        bgColor = const Color(0xFFf59e0b);
      } else if (status == _DayStatus.absent) {
        bgColor = const Color(0xFFEF4444);
      }

      cells.add(
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: bgColor?.withOpacity(0.2),
            borderRadius: BorderRadius.circular(8),
            border: bgColor != null
                ? Border.all(color: bgColor.withOpacity(0.5))
                : null,
          ),
          child: Center(
            child: Text(
              '$day',
              style: TextStyle(
                color: bgColor ?? const Color(0xFF64748B),
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      );
    }

    return GridView.count(
      crossAxisCount: 7,
      mainAxisSpacing: 6,
      crossAxisSpacing: 6,
      children: cells,
    );
  }

  Widget _buildLegendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
        ),
      ],
    );
  }

  String _monthYearString(DateTime date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return '${months[date.month - 1]} ${date.year}';
  }
}

enum _DayStatus { full, partial, absent }

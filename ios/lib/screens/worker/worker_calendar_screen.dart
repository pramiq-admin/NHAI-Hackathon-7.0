import 'package:flutter/material.dart';
import '../../i18n/app_localizations.dart';
import '../../storage/punch_events_repo.dart';
import '../../models/punch_event.dart';

class WorkerCalendarScreen extends StatefulWidget {
  const WorkerCalendarScreen({super.key});

  @override
  State<WorkerCalendarScreen> createState() => _WorkerCalendarScreenState();
}

class _WorkerCalendarScreenState extends State<WorkerCalendarScreen> {
  final PunchEventsRepo _punchEventsRepo = PunchEventsRepo();

  DateTime _currentMonth = DateTime.now();
  Map<int, _DayData> _dayData = {};
  bool _isLoading = true;
  int _fullDays = 0;
  double _totalHours = 0;
  double _avgPerDay = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final allEvents = await _punchEventsRepo.getAllEvents();
      _processEvents(allEvents);
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _processEvents(List<PunchEvent> allEvents) {
    final daysInMonth = DateTime(_currentMonth.year, _currentMonth.month + 1, 0).day;
    final Map<int, _DayData> dayData = {};
    int fullDays = 0;
    double totalHours = 0;
    int workedDays = 0;

    for (int day = 1; day <= daysInMonth; day++) {
      final date = DateTime(_currentMonth.year, _currentMonth.month, day);
      if (date.isAfter(DateTime.now())) continue;

      final dayEvents = allEvents.where((e) {
        return e.timestamp.year == date.year &&
            e.timestamp.month == date.month &&
            e.timestamp.day == date.day;
      }).toList();

      if (dayEvents.isEmpty) {
        dayData[day] = _DayData(status: _DayStatus.absent);
        continue;
      }

      final inEvents = dayEvents.where((e) => e.type == 'in').toList();
      final outEvents = dayEvents.where((e) => e.type == 'out').toList();

      DateTime? inTime;
      DateTime? outTime;
      double hours = 0;

      if (inEvents.isNotEmpty) inTime = inEvents.first.timestamp;
      if (outEvents.isNotEmpty) outTime = outEvents.first.timestamp;

      if (inTime != null && outTime != null) {
        hours = outTime.difference(inTime).inMinutes / 60.0;
        totalHours += hours;
        fullDays++;
        workedDays++;
        dayData[day] = _DayData(
          status: _DayStatus.full,
          inTime: inTime,
          outTime: outTime,
          hours: hours,
        );
      } else {
        workedDays++;
        dayData[day] = _DayData(
          status: _DayStatus.partial,
          inTime: inTime,
          outTime: outTime,
        );
      }
    }

    setState(() {
      _dayData = dayData;
      _fullDays = fullDays;
      _totalHours = totalHours;
      _avgPerDay = workedDays > 0 ? totalHours / workedDays : 0;
      _isLoading = false;
    });
  }

  void _previousMonth() {
    setState(() {
      _currentMonth = DateTime(_currentMonth.year, _currentMonth.month - 1);
    });
    _loadData();
  }

  void _nextMonth() {
    setState(() {
      _currentMonth = DateTime(_currentMonth.year, _currentMonth.month + 1);
    });
    _loadData();
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
          l10n.t('worker_cal.title'),
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3b82f6)))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Stats row
                Row(
                  children: [
                    Expanded(
                      child: _buildStatCard(
                        l10n.t('worker_cal.full_days'),
                        '$_fullDays',
                        const Color(0xFF10B981),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildStatCard(
                        l10n.t('worker_cal.total_hours'),
                        '${_totalHours.toStringAsFixed(1)}h',
                        const Color(0xFF3b82f6),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildStatCard(
                        l10n.t('worker_cal.avg'),
                        '${_avgPerDay.toStringAsFixed(1)}h',
                        const Color(0xFFf59e0b),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Month navigation
                Row(
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
                const SizedBox(height: 12),

                // Weekday headers
                Row(
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
                const SizedBox(height: 8),

                // Calendar grid
                _buildCalendarGrid(),
                const SizedBox(height: 16),

                // Legend
                Row(
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
                const SizedBox(height: 24),

                // Day details
                if (_dayData.isNotEmpty) ...[
                  Text(
                    'Details',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ..._dayData.entries
                      .where((e) => e.value.status != _DayStatus.absent)
                      .map((entry) => _buildDayDetail(entry.key, entry.value, l10n)),
                ],

                if (_dayData.isEmpty || _dayData.values.every((d) => d.status == _DayStatus.absent))
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Text(
                        l10n.t('worker_cal.no_data'),
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 15),
                      ),
                    ),
                  ),
              ],
            ),
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF1a1a3e),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 20,
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

  Widget _buildCalendarGrid() {
    final firstDay = DateTime(_currentMonth.year, _currentMonth.month, 1);
    final daysInMonth = DateTime(_currentMonth.year, _currentMonth.month + 1, 0).day;
    final startWeekday = firstDay.weekday;

    final List<Widget> cells = [];

    for (int i = 1; i < startWeekday; i++) {
      cells.add(const SizedBox(width: 40, height: 40));
    }

    for (int day = 1; day <= daysInMonth; day++) {
      final data = _dayData[day];
      Color? bgColor;
      if (data != null) {
        switch (data.status) {
          case _DayStatus.full:
            bgColor = const Color(0xFF10B981);
            break;
          case _DayStatus.partial:
            bgColor = const Color(0xFFf59e0b);
            break;
          case _DayStatus.absent:
            bgColor = const Color(0xFFEF4444);
            break;
        }
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
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
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

  Widget _buildDayDetail(int day, _DayData data, AppLocalizations l10n) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF1a1a3e),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: data.status == _DayStatus.full
                  ? const Color(0xFF10B981).withOpacity(0.2)
                  : const Color(0xFFf59e0b).withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Text(
                '$day',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (data.inTime != null)
                  Text(
                    '${l10n.t('worker_cal.in')}: ${_formatTime(data.inTime!)}',
                    style: const TextStyle(color: Color(0xFF10B981), fontSize: 12),
                  ),
                if (data.outTime != null)
                  Text(
                    '${l10n.t('worker_cal.out')}: ${_formatTime(data.outTime!)}',
                    style: const TextStyle(color: Color(0xFFf59e0b), fontSize: 12),
                  ),
              ],
            ),
          ),
          if (data.hours != null && data.hours! > 0)
            Text(
              '${l10n.t('worker_cal.duration')}: ${data.hours!.toStringAsFixed(1)}h',
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
        ],
      ),
    );
  }

  String _formatTime(DateTime time) {
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
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

class _DayData {
  final _DayStatus status;
  final DateTime? inTime;
  final DateTime? outTime;
  final double? hours;

  _DayData({
    required this.status,
    this.inTime,
    this.outTime,
    this.hours,
  });
}

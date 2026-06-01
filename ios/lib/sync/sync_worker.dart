import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/attendance_event.dart';
import 'api_client.dart';

class SyncResult {
  final int synced;
  final int failed;

  SyncResult({required this.synced, required this.failed});
}

class SyncWorker {
  static const _queueKey = 'attendance_sync_queue';
  final ApiClient _apiClient;

  SyncWorker(this._apiClient);

  Future<void> enqueueEvent(AttendanceEvent event) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = _getQueue(prefs);
    queue.add(event.toJson());
    await prefs.setString(_queueKey, jsonEncode(queue));
  }

  Future<int> getQueueSize() async {
    final prefs = await SharedPreferences.getInstance();
    return _getQueue(prefs).length;
  }

  Future<SyncResult> syncPendingEvents() async {
    final prefs = await SharedPreferences.getInstance();
    final queue = _getQueue(prefs);

    if (queue.isEmpty) {
      return SyncResult(synced: 0, failed: 0);
    }

    int synced = 0;
    int failed = 0;
    final remaining = <Map<String, dynamic>>[];

    const batchSize = 50;
    for (int i = 0; i < queue.length; i += batchSize) {
      final end = i + batchSize > queue.length ? queue.length : i + batchSize;
      final batch = queue.sublist(i, end);
      final events = batch.map((e) => AttendanceEvent.fromJson(e)).toList();

      try {
        await _apiClient.syncAttendanceBatch(events);
        synced += batch.length;
      } catch (_) {
        failed += batch.length;
        remaining.addAll(batch);
      }
    }

    await prefs.setString(_queueKey, jsonEncode(remaining));
    return SyncResult(synced: synced, failed: failed);
  }

  Future<void> clearQueue() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_queueKey);
  }

  List<Map<String, dynamic>> _getQueue(SharedPreferences prefs) {
    final raw = prefs.getString(_queueKey);
    if (raw == null || raw.isEmpty) return [];
    final decoded = jsonDecode(raw) as List;
    return decoded.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
}

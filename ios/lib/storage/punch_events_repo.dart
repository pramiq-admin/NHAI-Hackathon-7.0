import '../models/punch_event.dart';
import 'db_client.dart';

class PunchEventsRepo {
  final DbClient _dbClient = DbClient.instance;

  Future<void> insertPunchEvent(PunchEvent event) async {
    final db = await _dbClient.database;
    await db.insert('punch_events', event.toMap());
  }

  Future<List<PunchEvent>> getUnsyncedEvents(int limit) async {
    final db = await _dbClient.database;
    final maps = await db.query(
      'punch_events',
      where: 'synced = 0',
      limit: limit,
      orderBy: 'timestamp ASC',
    );
    return maps.map((m) => PunchEvent.fromMap(m)).toList();
  }

  Future<void> markSynced(List<String> ids) async {
    if (ids.isEmpty) return;
    final db = await _dbClient.database;
    final placeholders = ids.map((_) => '?').join(',');
    await db.rawUpdate(
      'UPDATE punch_events SET synced = 1 WHERE id IN ($placeholders)',
      ids,
    );
  }

  Future<void> markSyncFailed(List<String> ids) async {
    if (ids.isEmpty) return;
    final db = await _dbClient.database;
    final placeholders = ids.map((_) => '?').join(',');
    await db.rawUpdate(
      'UPDATE punch_events SET sync_attempts = sync_attempts + 1 WHERE id IN ($placeholders)',
      ids,
    );
  }

  Future<int> getUnsyncedCount() async {
    final db = await _dbClient.database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM punch_events WHERE synced = 0',
    );
    return result.first['count'] as int;
  }

  Future<List<PunchEvent>> getAllEvents() async {
    final db = await _dbClient.database;
    final maps = await db.query('punch_events', orderBy: 'timestamp DESC');
    return maps.map((m) => PunchEvent.fromMap(m)).toList();
  }
}

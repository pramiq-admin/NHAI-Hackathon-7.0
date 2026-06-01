import '../models/template.dart';
import 'db_client.dart';

class TemplatesRepo {
  final DbClient _dbClient = DbClient.instance;

  Future<List<FaceTemplate>> getAllTemplates() async {
    final db = await _dbClient.database;
    final maps = await db.query('templates');
    return maps.map((m) => FaceTemplate.fromMap(m)).toList();
  }

  Future<void> insertTemplate(FaceTemplate template) async {
    final db = await _dbClient.database;
    await db.insert('templates', template.toMap());
  }

  Future<void> deleteTemplate(String id) async {
    final db = await _dbClient.database;
    await db.delete('templates', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> deleteAll() async {
    final db = await _dbClient.database;
    await db.delete('templates');
  }

  Future<int> getCount() async {
    final db = await _dbClient.database;
    final result = await db.rawQuery('SELECT COUNT(*) as count FROM templates');
    return result.first['count'] as int;
  }
}

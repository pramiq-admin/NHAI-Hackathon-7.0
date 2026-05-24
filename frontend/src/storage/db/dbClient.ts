let db: any = null;
let dbReady = false;

export function getDb(): any {
  if (!dbReady) {
    try {
      const {open} = require('react-native-quick-sqlite');
      db = open({name: 'nhai_face_auth.db'});
      db.execute(`
        CREATE TABLE IF NOT EXISTS templates(
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          emb TEXT NOT NULL,
          bio_hash TEXT,
          salt TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )
      `);
      db.execute(
        'CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id)',
      );
      dbReady = true;
    } catch (e) {
      console.warn('SQLite init failed:', e);
      throw e;
    }
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

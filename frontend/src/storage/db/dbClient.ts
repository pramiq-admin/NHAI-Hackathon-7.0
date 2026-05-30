import {getCachedDbKey} from '../secure/dbKey';

let db: any = null;
let dbReady = false;

export function getDb(): any {
  if (!dbReady) {
    try {
      const {open} = require('react-native-quick-sqlite');
      // Pass the SQLCipher master key if the secure module produced one.
      // First-call ordering: App.tsx awaits `getOrCreateDbKey()` before the
      // first ML pipeline init so by the time getDb() runs, the cached key
      // is ready. If for some reason it's not, we open unencrypted and warn
      // — better that than the app refusing to boot for a worker mid-shift.
      const key = getCachedDbKey();
      const openOpts: any = {name: 'nhai_face_auth.db'};
      if (key) {
        openOpts.key = key;
      } else {
        console.warn(
          '[dbClient] opening SQLite WITHOUT encryption key — ' +
            'getOrCreateDbKey() was never awaited',
        );
      }
      db = open(openOpts);
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
      // Local punch_events table — offline-first storage for worker punches
      db.execute(`
        CREATE TABLE IF NOT EXISTS punch_events(
          id TEXT PRIMARY KEY,
          worker_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('in','out')),
          timestamp INTEGER NOT NULL,
          gps_lat REAL,
          gps_lon REAL,
          gps_accuracy REAL,
          face_match_score REAL,
          liveness_passed INTEGER DEFAULT 1,
          device_id TEXT,
          synced INTEGER DEFAULT 0,
          sync_attempts INTEGER DEFAULT 0,
          last_sync_error TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
        )
      `);
      db.execute(
        'CREATE INDEX IF NOT EXISTS idx_punch_worker_ts ON punch_events(worker_id, timestamp)',
      );
      db.execute(
        'CREATE INDEX IF NOT EXISTS idx_punch_unsynced ON punch_events(synced) WHERE synced = 0',
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
    dbReady = false;
  }
}

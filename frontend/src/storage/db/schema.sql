CREATE TABLE IF NOT EXISTS templates(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  emb TEXT NOT NULL,
  bio_hash TEXT,
  salt TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id);

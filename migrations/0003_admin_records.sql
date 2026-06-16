CREATE TABLE IF NOT EXISTS admin_records (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  related_type TEXT,
  related_id TEXT,
  created_by TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_records_status ON admin_records(status);
CREATE INDEX IF NOT EXISTS idx_admin_records_category ON admin_records(category);
CREATE INDEX IF NOT EXISTS idx_admin_records_created ON admin_records(created_at);

INSERT OR IGNORE INTO admin_records (
  id, category, title, body, status, priority, related_type, related_id, created_by
) VALUES (
  'admin-record-seed-001',
  'system',
  'Admin backend created',
  'Initial admin dashboard for members, cards, leads, events, points, and operation records.',
  'done',
  'normal',
  'system',
  'k-linksaas',
  'system'
);

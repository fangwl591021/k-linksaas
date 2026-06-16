CREATE TABLE IF NOT EXISTS member_crm_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  related_user_id TEXT,
  related_card_id TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  next_follow_up_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (related_user_id) REFERENCES users(id),
  FOREIGN KEY (related_card_id) REFERENCES cards(id)
);

CREATE INDEX IF NOT EXISTS idx_member_crm_user_created ON member_crm_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_crm_status ON member_crm_records(status);
CREATE INDEX IF NOT EXISTS idx_member_crm_category ON member_crm_records(category);
CREATE INDEX IF NOT EXISTS idx_member_crm_follow_up ON member_crm_records(next_follow_up_at);

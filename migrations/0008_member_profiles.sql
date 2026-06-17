CREATE TABLE IF NOT EXISTS member_profiles (
  user_id TEXT PRIMARY KEY,
  store_code TEXT NOT NULL UNIQUE,
  headline TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  line_friend_url TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  public_status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_profiles_store_code
ON member_profiles(store_code);

CREATE INDEX IF NOT EXISTS idx_member_profiles_public_status
ON member_profiles(public_status);

INSERT OR IGNORE INTO member_profiles (
  user_id,
  store_code,
  headline,
  intro,
  avatar_url,
  cover_url,
  line_friend_url,
  phone,
  website,
  public_status
)
SELECT
  u.id,
  COALESCE(NULLIF(u.member_no, ''), u.id),
  u.display_name || ' 的個人首頁',
  '這裡會整合個人名片、服務入口、聯絡按鈕與後續推薦追蹤。',
  '',
  '',
  '',
  '',
  '',
  'published'
FROM users u;

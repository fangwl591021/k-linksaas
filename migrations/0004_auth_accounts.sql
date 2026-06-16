CREATE TABLE IF NOT EXISTS auth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'password',
  provider_user_id TEXT,
  email TEXT,
  password_hash TEXT,
  salt TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT,
  UNIQUE(provider, provider_user_id),
  UNIQUE(provider, email),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_accounts_user ON auth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_accounts_email ON auth_accounts(email);

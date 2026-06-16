CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  auth_provider TEXT NOT NULL DEFAULT 'demo',
  provider_user_id TEXT,
  display_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(auth_provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  layout TEXT NOT NULL DEFAULT 'landscape',
  desc_color TEXT NOT NULL DEFAULT '#61707a',
  desc_align TEXT NOT NULL DEFAULT 'center',
  buttons_json TEXT NOT NULL DEFAULT '[]',
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  name TEXT NOT NULL,
  contact TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'web',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  card_id TEXT,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'web',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cards_slug ON cards(slug);
CREATE INDEX IF NOT EXISTS idx_cards_owner ON cards(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_card_created ON leads(card_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_card_type ON events(card_id, event_type);

INSERT OR IGNORE INTO users (id, auth_provider, provider_user_id, display_name, email, role)
VALUES ('demo-owner', 'demo', 'demo-owner', 'Demo Owner', 'owner@k-linksaas.local', 'owner');

INSERT OR IGNORE INTO cards (
  id,
  owner_id,
  slug,
  title,
  description,
  cover_url,
  layout,
  desc_color,
  desc_align,
  buttons_json,
  is_published
) VALUES (
  'demo-card',
  'demo-owner',
  'wang-li-chung',
  'Ruflo Cards Demo',
  'SaaS electronic business card demo. Edit, save, collect leads, and share to LINE.',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
  'landscape',
  '#61707a',
  'center',
  '[{"label":"LINE Login","url":"https://liff.line.me/2007221311-jwiMeoXT","color":"#06C755"},{"label":"Book a Demo","url":"https://k-linksaas.fangwl591021.workers.dev/","color":"#2c5f9e"},{"label":"Download vCard","url":"#vcard","color":"#c8792d"}]',
  1
);

ALTER TABLE users ADD COLUMN company TEXT;
ALTER TABLE users ADD COLUMN job_title TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN line_user_id TEXT;
ALTER TABLE users ADD COLUMN notes TEXT;

ALTER TABLE cards ADD COLUMN display_name TEXT;
ALTER TABLE cards ADD COLUMN company TEXT;
ALTER TABLE cards ADD COLUMN job_title TEXT;
ALTER TABLE cards ADD COLUMN phone TEXT;
ALTER TABLE cards ADD COLUMN email TEXT;
ALTER TABLE cards ADD COLUMN website TEXT;
ALTER TABLE cards ADD COLUMN line_url TEXT;
ALTER TABLE cards ADD COLUMN address TEXT;
ALTER TABLE cards ADD COLUMN theme_color TEXT NOT NULL DEFAULT '#147d64';
ALTER TABLE cards ADD COLUMN public_note TEXT;

UPDATE users
SET company = COALESCE(company, ''),
    job_title = COALESCE(job_title, ''),
    phone = COALESCE(phone, ''),
    status = COALESCE(status, 'active'),
    plan = COALESCE(plan, 'free')
WHERE company IS NULL OR job_title IS NULL OR phone IS NULL;

UPDATE cards
SET display_name = COALESCE(display_name, title),
    company = COALESCE(company, ''),
    job_title = COALESCE(job_title, ''),
    email = COALESCE(email, ''),
    website = COALESCE(website, ''),
    line_url = COALESCE(line_url, ''),
    address = COALESCE(address, '')
WHERE display_name IS NULL OR company IS NULL OR job_title IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_status_plan ON users(status, plan);
CREATE INDEX IF NOT EXISTS idx_users_line_user ON users(line_user_id);

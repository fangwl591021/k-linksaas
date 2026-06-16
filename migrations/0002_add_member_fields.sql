ALTER TABLE users ADD COLUMN member_no TEXT;
ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 0;

UPDATE users
SET member_no = 'M000001'
WHERE id = 'demo-owner' AND member_no IS NULL;

UPDATE users
SET member_no = 'M' || substr('000000' || rowid, -6, 6)
WHERE member_no IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_member_no ON users(member_no);
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points);

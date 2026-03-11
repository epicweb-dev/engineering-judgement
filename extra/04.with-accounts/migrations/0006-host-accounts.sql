CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY NOT NULL,
	email TEXT NOT NULL UNIQUE,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS host_login_tokens (
	id TEXT PRIMARY KEY NOT NULL,
	user_id TEXT NOT NULL,
	token_hash TEXT NOT NULL UNIQUE,
	expires_at TEXT NOT NULL,
	created_at TEXT NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_host_login_tokens_user_id
	ON host_login_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_host_login_tokens_expires_at
	ON host_login_tokens(expires_at);

ALTER TABLE schedules ADD COLUMN owner_user_id TEXT;
ALTER TABLE schedules ADD COLUMN claimed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_schedules_owner_user_id
	ON schedules(owner_user_id);

CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	username TEXT NOT NULL UNIQUE,
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS password_resets (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	user_id INTEGER NOT NULL,
	token_hash TEXT NOT NULL UNIQUE,
	expires_at INTEGER NOT NULL,
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);

CREATE TABLE IF NOT EXISTS mock_resend_messages (
	id TEXT PRIMARY KEY,
	token_hash TEXT NOT NULL,
	received_at INTEGER NOT NULL,
	from_email TEXT NOT NULL,
	to_json TEXT NOT NULL,
	subject TEXT NOT NULL,
	html TEXT NOT NULL,
	payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS mock_resend_messages_token_received_at
	ON mock_resend_messages(token_hash, received_at DESC);

CREATE TABLE IF NOT EXISTS schedules (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	schedule_key TEXT NOT NULL UNIQUE,
	host_key TEXT NOT NULL UNIQUE,
	title TEXT NOT NULL,
	start_date TEXT NOT NULL,
	end_date TEXT NOT NULL,
	slot_minutes INTEGER NOT NULL,
	timezone TEXT NOT NULL,
	created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_schedules_schedule_key
	ON schedules(schedule_key);

CREATE INDEX IF NOT EXISTS idx_schedules_host_key
	ON schedules(host_key);

CREATE TABLE IF NOT EXISTS schedule_slots (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	schedule_id INTEGER NOT NULL,
	starts_at_utc TEXT NOT NULL,
	FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
	UNIQUE(schedule_id, starts_at_utc)
);

CREATE INDEX IF NOT EXISTS idx_schedule_slots_schedule_id
	ON schedule_slots(schedule_id);

CREATE INDEX IF NOT EXISTS idx_schedule_slots_starts_at_utc
	ON schedule_slots(starts_at_utc);

CREATE TABLE IF NOT EXISTS attendee_availability (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	schedule_id INTEGER NOT NULL,
	attendee_name TEXT NOT NULL,
	attendee_name_key TEXT NOT NULL,
	slot_utc TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attendee_availability_schedule
	ON attendee_availability(schedule_id);

CREATE INDEX IF NOT EXISTS idx_attendee_availability_attendee
	ON attendee_availability(schedule_id, attendee_name_key);

CREATE INDEX IF NOT EXISTS idx_attendee_availability_slot
	ON attendee_availability(schedule_id, slot_utc);

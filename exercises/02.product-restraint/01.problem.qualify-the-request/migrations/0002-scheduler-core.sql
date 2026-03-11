DROP TABLE IF EXISTS mock_resend_messages;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS schedules (
	id TEXT PRIMARY KEY NOT NULL,
	share_token TEXT NOT NULL UNIQUE,
	title TEXT NOT NULL,
	interval_minutes INTEGER NOT NULL CHECK (interval_minutes IN (15, 30, 60)),
	range_start_utc TEXT NOT NULL,
	range_end_utc TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attendees (
	id TEXT PRIMARY KEY NOT NULL,
	schedule_id TEXT NOT NULL,
	name TEXT NOT NULL,
	name_norm TEXT NOT NULL,
	is_host INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL,
	FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
	UNIQUE (schedule_id, name_norm)
);

CREATE TABLE IF NOT EXISTS availability (
	schedule_id TEXT NOT NULL,
	attendee_id TEXT NOT NULL,
	slot_start_utc TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	PRIMARY KEY (attendee_id, slot_start_utc),
	FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
	FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schedules_share_token ON schedules(share_token);
CREATE INDEX IF NOT EXISTS idx_attendees_schedule_id ON attendees(schedule_id);
CREATE INDEX IF NOT EXISTS idx_availability_schedule_slot
	ON availability(schedule_id, slot_start_utc);

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

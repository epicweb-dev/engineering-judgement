CREATE TABLE IF NOT EXISTS schedule_blocked_slots (
	schedule_id TEXT NOT NULL,
	slot_start_utc TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	PRIMARY KEY (schedule_id, slot_start_utc),
	FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schedule_blocked_slots_schedule
	ON schedule_blocked_slots(schedule_id);

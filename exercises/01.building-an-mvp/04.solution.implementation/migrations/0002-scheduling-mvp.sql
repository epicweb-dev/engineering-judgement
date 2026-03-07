CREATE TABLE IF NOT EXISTS events (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	title TEXT NOT NULL,
	host_key TEXT NOT NULL UNIQUE,
	finalized_slot_id INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_host_key ON events(host_key);

CREATE TABLE IF NOT EXISTS event_slots (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	event_id INTEGER NOT NULL,
	label TEXT NOT NULL,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_slots_event_id ON event_slots(event_id);
CREATE INDEX IF NOT EXISTS idx_event_slots_event_order ON event_slots(event_id, sort_order);

CREATE TABLE IF NOT EXISTS event_responses (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	event_id INTEGER NOT NULL,
	slot_id INTEGER NOT NULL,
	participant_name TEXT NOT NULL,
	participant_key TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
	FOREIGN KEY (slot_id) REFERENCES event_slots(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_responses_unique_vote
	ON event_responses(event_id, slot_id, participant_key);
CREATE INDEX IF NOT EXISTS idx_event_responses_event_id
	ON event_responses(event_id);
CREATE INDEX IF NOT EXISTS idx_event_responses_participant
	ON event_responses(event_id, participant_key);

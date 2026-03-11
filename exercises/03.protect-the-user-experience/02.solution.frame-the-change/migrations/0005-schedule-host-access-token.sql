ALTER TABLE schedules ADD COLUMN host_access_token_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_host_access_token_hash
	ON schedules(host_access_token_hash);

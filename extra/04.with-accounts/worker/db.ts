import { column as c, createDatabase, sql, table } from 'remix/data-table'
import { createD1DataTableAdapter } from './d1-data-table-adapter.ts'

export const schedulesTable = table({
	name: 'schedules',
	columns: {
		id: c.text(),
		share_token: c.text(),
		title: c.text(),
		interval_minutes: c.integer(),
		range_start_utc: c.text(),
		range_end_utc: c.text(),
		created_at: c.text(),
	},
	primaryKey: 'id',
})

export const attendeesTable = table({
	name: 'attendees',
	columns: {
		id: c.text(),
		schedule_id: c.text(),
		name: c.text(),
		name_norm: c.text(),
		is_host: c.integer(),
		time_zone: c.text(),
		created_at: c.text(),
	},
	primaryKey: 'id',
})

export const availabilityTable = table({
	name: 'availability',
	columns: {
		schedule_id: c.text(),
		attendee_id: c.text(),
		slot_start_utc: c.text(),
		updated_at: c.text(),
	},
	primaryKey: ['attendee_id', 'slot_start_utc'],
})

export function createDb(db: D1Database) {
	return createDatabase(createD1DataTableAdapter(db))
}

export type AppDatabase = ReturnType<typeof createDb>
export { sql }

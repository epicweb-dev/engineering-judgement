import { createDatabase, createTable, sql } from 'remix/data-table'
import { number, string } from 'remix/data-schema'
import { createD1DataTableAdapter } from './d1-data-table-adapter.ts'

export const schedulesTable = createTable({
	name: 'schedules',
	columns: {
		id: string(),
		share_token: string(),
		title: string(),
		interval_minutes: number(),
		range_start_utc: string(),
		range_end_utc: string(),
		created_at: string(),
	},
	primaryKey: 'id',
})

export const attendeesTable = createTable({
	name: 'attendees',
	columns: {
		id: string(),
		schedule_id: string(),
		name: string(),
		name_norm: string(),
		is_host: number(),
		time_zone: string(),
		created_at: string(),
	},
	primaryKey: 'id',
})

export const availabilityTable = createTable({
	name: 'availability',
	columns: {
		schedule_id: string(),
		attendee_id: string(),
		slot_start_utc: string(),
		updated_at: string(),
	},
	primaryKey: ['attendee_id', 'slot_start_utc'],
})

export function createDb(db: D1Database) {
	return createDatabase(createD1DataTableAdapter(db))
}

export type AppDatabase = ReturnType<typeof createDb>
export { sql }

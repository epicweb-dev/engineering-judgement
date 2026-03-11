import { expect, test } from 'vitest'
import {
	buildGridModel,
	createSlotRangeFromDateInputs,
} from './schedule-utils.ts'

const inNewYorkTimeZone =
	Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/New_York'
const testInNewYork = inNewYorkTimeZone ? test : test.skip

testInNewYork('spring-forward gap renders two missing local-time cells', () => {
	const range = createSlotRangeFromDateInputs({
		startDateInput: '2026-03-07',
		endDateInput: '2026-03-09',
		intervalMinutes: 30,
	})
	const grid = buildGridModel(range.slots)
	const missingOnMarch8: Array<string> = []

	for (const timeKey of grid.timeKeys) {
		if (!grid.cellByDayAndTime['2026-03-08']?.[timeKey]) {
			missingOnMarch8.push(timeKey)
		}
	}

	expect(missingOnMarch8).toEqual(['02:00', '02:30'])
})

testInNewYork(
	'fall-back day keeps both repeated local times as unique rows',
	() => {
		const range = createSlotRangeFromDateInputs({
			startDateInput: '2026-10-31',
			endDateInput: '2026-11-02',
			intervalMinutes: 30,
		})
		const grid = buildGridModel(range.slots)

		expect(grid.timeKeys).toContain('01:00')
		expect(grid.timeKeys).toContain('01:00#2')
		expect(grid.timeKeys).toContain('01:30')
		expect(grid.timeKeys).toContain('01:30#2')
		expect(Object.keys(grid.cellByDayAndTime['2026-11-01'] ?? {})).toHaveLength(
			50,
		)
		expect(grid.timeLabels['01:00']).not.toBe(grid.timeLabels['01:00#2'])
		expect(grid.timeLabels['01:30']).not.toBe(grid.timeLabels['01:30#2'])
	},
)

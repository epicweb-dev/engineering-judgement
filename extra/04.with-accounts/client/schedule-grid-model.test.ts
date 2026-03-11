import { expect, test } from 'vitest'
import { buildScheduleGridTableModel } from './schedule-grid-model.ts'

function toIso(year: number, month: number, day: number, hour: number) {
	return new Date(year, month - 1, day, hour, 0, 0, 0).toISOString()
}

test('buildScheduleGridTableModel reports missing sparse cells', () => {
	const slots = [
		toIso(2026, 1, 1, 9),
		toIso(2026, 1, 1, 10),
		toIso(2026, 1, 2, 9),
	]
	const model = buildScheduleGridTableModel({ slots })

	expect(model.dayKeys).toHaveLength(2)
	expect(model.timeKeys).toHaveLength(2)
	expect(model.missingSlotCellCount).toBe(1)
})

test('buildScheduleGridTableModel collapses disabled-only rows and columns', () => {
	const firstDayNine = toIso(2026, 1, 1, 9)
	const firstDayTen = toIso(2026, 1, 1, 10)
	const secondDayNine = toIso(2026, 1, 2, 9)
	const model = buildScheduleGridTableModel({
		slots: [firstDayNine, firstDayTen, secondDayNine],
		disabledSlots: new Set([firstDayTen, secondDayNine]),
		hideDisabledOnlyRowsAndColumns: true,
	})

	expect(model.dayKeys).toHaveLength(1)
	expect(model.timeKeys).toHaveLength(1)
	expect(model.missingSlotCellCount).toBe(0)
	expect(
		model.cellByDayAndTime[model.dayKeys[0] ?? '']?.[model.timeKeys[0] ?? ''],
	).toBe(firstDayNine)
})

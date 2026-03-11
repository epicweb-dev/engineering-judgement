import { expect, test } from 'vitest'
import {
	generateLocalSlotKeys,
	localSlotKeyToUtcIso,
	utcIsoToLocalSlotKey,
} from './scheduling-time.ts'

test('generateLocalSlotKeys creates full-day coverage for slot increment', () => {
	const slots = generateLocalSlotKeys('2026-03-07', '2026-03-07', 30)
	expect(slots).toHaveLength(48)
	expect(slots[0]).toBe('2026-03-07T00:00')
	expect(slots.at(-1)).toBe('2026-03-07T23:30')
})

test('timezone conversion round-trips local key through UTC', () => {
	const localSlotKey = '2026-11-01T01:30'
	const utcIso = localSlotKeyToUtcIso(localSlotKey, 'America/New_York')
	const backToLocal = utcIsoToLocalSlotKey(utcIso, 'America/New_York')
	expect(backToLocal).toBe(localSlotKey)
})


import { type ScheduleSnapshot } from '#shared/schedule-store.ts'

export type SlotAvailability = {
	count: number
	availableNames: Array<string>
}

export function createSlotAvailability(snapshot: ScheduleSnapshot | null) {
	const availability: Record<string, SlotAvailability> = {}
	if (!snapshot) return availability

	for (const slot of snapshot.slots) {
		availability[slot] = {
			count: snapshot.countsBySlot[slot] ?? 0,
			availableNames: snapshot.availableNamesBySlot[slot] ?? [],
		}
	}

	return availability
}

export function getMaxAvailabilityCount(
	slotAvailability: Record<string, SlotAvailability>,
) {
	const maxCount = Object.values(slotAvailability).reduce(
		(highest, slot) => Math.max(highest, slot.count),
		0,
	)
	return Math.max(1, maxCount)
}

import { type Handle } from 'remix/component'
import {
	colors,
	radius,
	spacing,
	typography,
} from '#client/styles/tokens.ts'
import {
	createDateRange,
	createSlotId,
	formatDisplayDate,
	timeSlotOptions,
	type SlotId,
} from '#shared/schedule-model.ts'
import { TimeSlotCell } from './time-slot-cell.tsx'

type ScheduleGridSetup = {
	startDate: string
	endDate: string
	selectedSlots: Array<SlotId>
	enabledSlots?: Array<SlotId>
	onSelectedSlotsChange: (slots: Array<SlotId>) => void
}

type DragState = {
	active: boolean
	originDate: string
	originTime: string
	pointerX: number
	pointerY: number
	scrollTimer: number | null
}

const gridScrollerId = 'schedule-grid-scroller'

function parseSlotId(slotId: SlotId) {
	const [date, time] = slotId.split('|')
	if (!date || !time) return null
	return { date, time }
}

function setWithToggle(set: Set<SlotId>, slotId: SlotId) {
	if (set.has(slotId)) {
		set.delete(slotId)
	} else {
		set.add(slotId)
	}
}

function selectRangeOnDate(
	selected: Set<SlotId>,
	date: string,
	startTime: string,
	endTime: string,
	enabledSet: Set<SlotId>,
) {
	const startIndex = timeSlotOptions.indexOf(startTime as (typeof timeSlotOptions)[number])
	const endIndex = timeSlotOptions.indexOf(endTime as (typeof timeSlotOptions)[number])
	if (startIndex < 0 || endIndex < 0) return
	const [from, to] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex]
	for (let index = from; index <= to; index += 1) {
		const time = timeSlotOptions[index]
		if (!time) continue
		const slotId = createSlotId(date, time)
		if (!enabledSet.has(slotId)) continue
		selected.add(slotId)
	}
}

function readSlotFromPoint(x: number, y: number): SlotId | null {
	const target = document.elementFromPoint(x, y)
	const slotElement = target?.closest('[data-slot-id]')
	if (!slotElement) return null
	if (!(slotElement instanceof HTMLElement)) return null
	const slotId = slotElement.dataset.slotId
	return slotId ? (slotId as SlotId) : null
}

function startEdgeAutoScroll(
	dragState: DragState,
	getScroller: () => HTMLElement | null,
) {
	if (dragState.scrollTimer !== null) return
	dragState.scrollTimer = window.setInterval(() => {
		const scroller = getScroller()
		if (!scroller) return
		const rect = scroller.getBoundingClientRect()
		const threshold = 40
		const deltaY =
			dragState.pointerY < rect.top + threshold
				? -12
				: dragState.pointerY > rect.bottom - threshold
					? 12
					: 0
		const deltaX =
			dragState.pointerX < rect.left + threshold
				? -10
				: dragState.pointerX > rect.right - threshold
					? 10
					: 0
		if (deltaY !== 0) {
			scroller.scrollTop += deltaY
		}
		if (deltaX !== 0) {
			scroller.scrollLeft += deltaX
		}
	}, 16)
}

function stopEdgeAutoScroll(dragState: DragState) {
	if (dragState.scrollTimer !== null) {
		window.clearInterval(dragState.scrollTimer)
		dragState.scrollTimer = null
	}
}

export function ScheduleGrid(handle: Handle, setup: ScheduleGridSetup) {
	const dragState: DragState = {
		active: false,
		originDate: '',
		originTime: '',
		pointerX: 0,
		pointerY: 0,
		scrollTimer: null,
	}

	function getSelectedSet() {
		return new Set<SlotId>(setup.selectedSlots)
	}

	function enabledSetFromProps() {
		if (!setup.enabledSlots) {
			const full = new Set<SlotId>()
			for (const date of createDateRange(setup.startDate, setup.endDate)) {
				for (const time of timeSlotOptions) {
					full.add(createSlotId(date, time))
				}
			}
			return full
		}
		return new Set<SlotId>(setup.enabledSlots)
	}

	function commit(selected: Set<SlotId>) {
		setup.onSelectedSlotsChange(Array.from(selected).sort())
	}

	function onToggleSlot(slotId: SlotId) {
		const enabledSet = enabledSetFromProps()
		if (!enabledSet.has(slotId)) return
		const selected = getSelectedSet()
		setWithToggle(selected, slotId)
		commit(selected)
	}

	function getScrollerElement() {
		return document.getElementById(gridScrollerId)
	}

	function handleDragMove(event: PointerEvent) {
		if (!dragState.active) return
		dragState.pointerX = event.clientX
		dragState.pointerY = event.clientY
		const slotId = readSlotFromPoint(event.clientX, event.clientY)
		if (!slotId) return
		const parsed = parseSlotId(slotId)
		if (!parsed) return
		if (parsed.date !== dragState.originDate) return
		const selected = getSelectedSet()
		const enabledSet = enabledSetFromProps()
		selectRangeOnDate(
			selected,
			dragState.originDate,
			dragState.originTime,
			parsed.time,
			enabledSet,
		)
		commit(selected)
	}

	function stopDrag() {
		if (!dragState.active) return
		dragState.active = false
		stopEdgeAutoScroll(dragState)
		window.removeEventListener('pointermove', handleDragMove)
		window.removeEventListener('pointerup', stopDrag)
		window.removeEventListener('pointercancel', stopDrag)
	}

	function onDragStart(event: PointerEvent, slotId: SlotId) {
		event.preventDefault()
		const parsed = parseSlotId(slotId)
		if (!parsed) return
		dragState.active = true
		dragState.originDate = parsed.date
		dragState.originTime = parsed.time
		dragState.pointerX = event.clientX
		dragState.pointerY = event.clientY
		startEdgeAutoScroll(dragState, getScrollerElement)
		window.addEventListener('pointermove', handleDragMove)
		window.addEventListener('pointerup', stopDrag)
		window.addEventListener('pointercancel', stopDrag)
	}

	if (typeof window !== 'undefined') {
		handle.on(window, {
			beforeunload: stopDrag,
		})
	}

	return () => {
		const dates = createDateRange(setup.startDate, setup.endDate)
		const selectedSet = new Set(setup.selectedSlots)
		const enabledSet = enabledSetFromProps()
		const canRender = dates.length > 0

		if (!canRender) {
			return (
				<p css={{ color: colors.textMuted, margin: 0 }}>
					Pick a valid date range to configure availability.
				</p>
			)
		}

		return (
			<section
				id={gridScrollerId}
				css={{
					border: `1px solid ${colors.border}`,
					borderRadius: radius.lg,
					padding: spacing.md,
					display: 'grid',
					gap: spacing.md,
					overflow: 'auto',
					maxHeight: '28rem',
					backgroundColor: colors.surface,
				}}
			>
				{dates.map((date) => (
					<div key={date} css={{ display: 'grid', gap: spacing.sm }}>
						<h3
							css={{
								margin: 0,
								fontSize: typography.fontSize.sm,
								color: colors.textMuted,
								fontWeight: typography.fontWeight.medium,
							}}
						>
							{formatDisplayDate(date)}
						</h3>
						<div
							css={{
								display: 'grid',
								gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))',
								gap: spacing.xs,
							}}
						>
							{timeSlotOptions.map((time) => {
								const slotId = createSlotId(date, time)
								const selected = selectedSet.has(slotId)
								const disabled = !enabledSet.has(slotId)
								return (
									<TimeSlotCell
										key={slotId}
										setup={{
											slotId,
											label: time,
											selected,
											disabled,
											showDragHandle: selected && !disabled,
											onToggle: onToggleSlot,
											onDragStart,
										}}
									/>
								)
							})}
						</div>
					</div>
				))}
			</section>
		)
	}
}


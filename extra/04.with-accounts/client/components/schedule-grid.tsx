import {
	colors,
	mq,
	radius,
	spacing,
	typography,
} from '#client/styles/tokens.ts'
import { visuallyHiddenCss } from '#client/styles/visually-hidden.ts'
import { getScheduleCellBackgroundColor } from '#client/schedule-grid-colors.ts'
import {
	buildScheduleGridTableModel,
	type ScheduleGridSlotAvailability,
} from '#client/schedule-grid-model.ts'
import {
	formatSlotLabel,
	parseDateInputToLocalDate,
	toDayKey,
} from '#client/schedule-utils.ts'

const gridNavigationKeys = new Set([
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'Home',
	'End',
	'PageUp',
	'PageDown',
])

type ScheduleGridProps = {
	slots: Array<string>
	selectedSlots: ReadonlySet<string>
	disabledSlots?: ReadonlySet<string>
	hideDisabledOnlyRowsAndColumns?: boolean
	highlightedSlots?: ReadonlySet<string>
	highlightedSlotLabel?: string
	selectionSlots?: ReadonlySet<string>
	selectionSlotLabel?: string
	selectedSlotLabel?: string
	unselectedSlotLabel?: string
	selectedBackground?: string
	pending?: boolean
	mobileDayKey?: string | null
	slotAvailability: Record<string, ScheduleGridSlotAvailability>
	maxAvailabilityCount: number
	activeSlot: string | null
	rangeAnchor: string | null
	readOnly?: boolean
	desktopHorizontalOverflow?: 'page' | 'local'
	onMobileDayChange?: (dayKey: string) => void
	onCellPointerDown?: (slot: string, event: PointerEvent) => void
	onCellPointerEnter?: (slot: string, event: PointerEvent) => void
	onCellPointerMove?: (slot: string, event: PointerEvent) => void
	onCellPointerUp?: (slot: string, event: PointerEvent) => void
	onCellClick?: (slot: string, event: MouseEvent) => void
	onCellKeyboardActivate?: (slot: string) => void
	onCellFocus?: (slot: string) => void
	onCellHover?: (slot: string | null) => void
	onCellKeyboardNavigate?: (params: {
		fromSlot: string
		toSlot: string
		key: string
		shiftKey: boolean
	}) => void
	dayHeaderLayout?: 'single-line' | 'stacked'
	dayColumnWidth?: 'default' | 'narrow'
	showWeekSeparators?: boolean
	outlinedSlots?: ReadonlySet<string>
	outlinedSlotLabel?: string
	accentedSlots?: ReadonlySet<string>
	accentedSlotLabel?: string
	fitToContentWidth?: boolean
}

function toSelectionLabel(params: {
	selected: boolean
	selectedSlotLabel?: string
	unselectedSlotLabel?: string
}) {
	if (params.selected) {
		return params.selectedSlotLabel ?? 'selected for your availability'
	}
	return params.unselectedSlotLabel ?? 'not selected for your availability'
}

function getCellBackground(params: {
	count: number
	maxCount: number
	isSelected: boolean
	isDisabled: boolean
	isHighlighted: boolean
	selectedBackground?: string
}) {
	if (params.isDisabled) {
		return 'color-mix(in srgb, var(--color-background) 86%, var(--color-surface))'
	}
	if (params.isSelected && params.selectedBackground) {
		return params.selectedBackground
	}
	if (params.isHighlighted) {
		return `color-mix(in srgb, ${colors.success} 46%, var(--color-surface))`
	}
	return getScheduleCellBackgroundColor({
		count: params.count,
		maxCount: params.maxCount,
		isSelected: params.isSelected,
	})
}

const dayHeaderMonthDayFormatter = new Intl.DateTimeFormat(undefined, {
	month: 'short',
	day: 'numeric',
})
const dayHeaderWeekdayFormatter = new Intl.DateTimeFormat(undefined, {
	weekday: 'short',
})

function formatStackedDayHeader(dayKey: string, fallbackLabel: string) {
	const date = parseDateInputToLocalDate(dayKey)
	if (!date) {
		return {
			monthDay: fallbackLabel,
			weekday: '',
		}
	}
	return {
		monthDay: dayHeaderMonthDayFormatter.format(date),
		weekday: dayHeaderWeekdayFormatter.format(date),
	}
}

function isStartOfWeek(dayKey: string) {
	const date = parseDateInputToLocalDate(dayKey)
	if (!date) return false
	return date.getDay() === 0
}

function getRowCells(row: HTMLTableRowElement) {
	return Array.from(row.querySelectorAll('td'))
}

function getCellButton(cell: HTMLTableCellElement) {
	const button = cell.querySelector('button[data-slot]')
	return button instanceof HTMLButtonElement ? button : null
}

function moveFocusWithinGridCellButtons(params: {
	key: string
	currentButton: HTMLButtonElement
}) {
	const currentCell = params.currentButton.closest('td')
	const currentRow = currentCell?.parentElement
	const tableBody = currentRow?.parentElement
	if (!(currentCell instanceof HTMLTableCellElement)) return null
	if (!(currentRow instanceof HTMLTableRowElement)) return null
	if (!(tableBody instanceof HTMLTableSectionElement)) return null
	if (tableBody.tagName.toLowerCase() !== 'tbody') return null

	const rows = Array.from(tableBody.querySelectorAll('tr'))
	const rowIndex = rows.indexOf(currentRow)
	if (rowIndex < 0) return null

	const rowCells = getRowCells(currentRow)
	const columnIndex = rowCells.indexOf(currentCell)
	if (columnIndex < 0) return null

	function focusButton(button: HTMLButtonElement) {
		button.focus()
		return button
	}

	function focusCellAt(row: HTMLTableRowElement, col: number) {
		const cell = getRowCells(row)[col]
		if (!cell) return null
		const button = getCellButton(cell)
		if (!button) return null
		return focusButton(button)
	}

	function focusInRow(startIndex: number, step: 1 | -1) {
		let nextIndex = startIndex + step
		while (nextIndex >= 0 && nextIndex < rowCells.length) {
			const cell = rowCells[nextIndex]
			if (cell) {
				const button = getCellButton(cell)
				if (button) return focusButton(button)
			}
			nextIndex += step
		}
		return null
	}

	function focusInColumn(startIndex: number, step: 1 | -1) {
		let nextIndex = startIndex + step
		while (nextIndex >= 0 && nextIndex < rows.length) {
			const row = rows[nextIndex]
			if (row) {
				const button = focusCellAt(row, columnIndex)
				if (button) return button
			}
			nextIndex += step
		}
		return null
	}

	if (params.key === 'ArrowLeft') return focusInRow(columnIndex, -1)
	if (params.key === 'ArrowRight') return focusInRow(columnIndex, 1)
	if (params.key === 'ArrowUp') return focusInColumn(rowIndex, -1)
	if (params.key === 'ArrowDown') return focusInColumn(rowIndex, 1)
	if (params.key === 'PageUp') {
		for (let nextIndex = 0; nextIndex < rowIndex; nextIndex += 1) {
			const row = rows[nextIndex]
			if (row) {
				const button = focusCellAt(row, columnIndex)
				if (button) return button
			}
		}
		return null
	}
	if (params.key === 'PageDown') {
		for (
			let nextIndex = rows.length - 1;
			nextIndex > rowIndex;
			nextIndex -= 1
		) {
			const row = rows[nextIndex]
			if (row) {
				const button = focusCellAt(row, columnIndex)
				if (button) return button
			}
		}
		return null
	}
	if (params.key === 'Home') {
		for (const cell of rowCells) {
			const button = getCellButton(cell)
			if (!button) continue
			return focusButton(button)
		}
		return null
	}
	if (params.key === 'End') {
		for (let index = rowCells.length - 1; index >= 0; index -= 1) {
			const cell = rowCells[index]
			if (!cell) continue
			const button = getCellButton(cell)
			if (!button) continue
			return focusButton(button)
		}
		return null
	}
	return null
}

export function renderScheduleGrid(props: ScheduleGridProps) {
	const grid = buildScheduleGridTableModel({
		slots: props.slots,
		disabledSlots: props.disabledSlots,
		hideDisabledOnlyRowsAndColumns: props.hideDisabledOnlyRowsAndColumns,
	})
	const {
		dayKeys,
		dayLabels,
		timeKeys,
		timeLabels,
		cellByDayAndTime,
		missingSlotCellCount,
	} = grid
	const hasMissingSlots = missingSlotCellCount > 0
	const activeDayKey = toDayKey(props.activeSlot)
	const defaultMobileDayKey =
		activeDayKey && dayKeys.includes(activeDayKey)
			? activeDayKey
			: (dayKeys[0] ?? null)
	const resolvedMobileDayKey =
		props.mobileDayKey && dayKeys.includes(props.mobileDayKey)
			? props.mobileDayKey
			: defaultMobileDayKey
	const mobileDayIndex = resolvedMobileDayKey
		? dayKeys.indexOf(resolvedMobileDayKey)
		: -1
	const previousDayKey =
		mobileDayIndex > 0 ? (dayKeys[mobileDayIndex - 1] ?? null) : null
	const nextDayKey =
		mobileDayIndex >= 0 && mobileDayIndex < dayKeys.length - 1
			? (dayKeys[mobileDayIndex + 1] ?? null)
			: null
	const mobileVisibleDayKeys = resolvedMobileDayKey
		? [resolvedMobileDayKey]
		: dayKeys
	const desktopVisibleDayKeys = dayKeys
	const desktopHorizontalOverflow = props.desktopHorizontalOverflow ?? 'page'
	const useStackedDayHeader = props.dayHeaderLayout === 'stacked'
	const useNarrowDayColumns = props.dayColumnWidth === 'narrow'
	const dayColumnWidthRem = useNarrowDayColumns ? 6.2 : 8
	const timeColumnWidthRem = useNarrowDayColumns ? 5 : 5.6
	const weekSeparatorWidth = props.showWeekSeparators ? '0.35rem' : '0'

	function shouldClearHoverOnPointerLeave(event: PointerEvent) {
		const currentTarget = event.currentTarget
		const relatedTarget = event.relatedTarget
		if (!(currentTarget instanceof Element)) return true
		if (!(relatedTarget instanceof Element)) return true
		const currentScroller = currentTarget.closest(
			'[data-schedule-grid-scroller]',
		)
		if (!currentScroller) return true
		const relatedSlotButton =
			relatedTarget.closest('button[data-slot]') ??
			relatedTarget.closest('td')?.querySelector('button[data-slot]')
		if (!relatedSlotButton) return true
		const relatedScroller = relatedSlotButton.closest(
			'[data-schedule-grid-scroller]',
		)
		if (!relatedScroller) return true
		return currentScroller !== relatedScroller
	}

	function renderGridTable(visibleDayKeys: Array<string>, compact: boolean) {
		const fitToContent = !!props.fitToContentWidth && !compact
		const tableCaption = props.readOnly
			? 'Availability grid. Use arrow keys to move between time slots. Press Enter or Space to focus slot details.'
			: 'Editable availability grid. Use arrow keys to move between time slots. Hold Shift while moving to preview a range. Press Enter or Space to apply toggles. On pointer devices, drag to select a range.'

		function handleCellKeyDown(event: KeyboardEvent) {
			if (event.metaKey || event.ctrlKey || event.altKey) return
			const currentTarget = event.currentTarget
			if (!(currentTarget instanceof HTMLButtonElement)) return
			const slot = currentTarget.dataset.slot
			if (
				(event.key === 'Enter' ||
					event.key === ' ' ||
					event.key === 'Spacebar') &&
				slot &&
				props.onCellKeyboardActivate
			) {
				event.preventDefault()
				props.onCellKeyboardActivate(slot)
				return
			}
			if (!gridNavigationKeys.has(event.key)) return
			const fromSlot = currentTarget.dataset.slot
			const focusedButton = moveFocusWithinGridCellButtons({
				key: event.key,
				currentButton: currentTarget,
			})
			event.preventDefault()
			if (!focusedButton) return
			const toSlot = focusedButton.dataset.slot
			if (!fromSlot || !toSlot) return
			props.onCellKeyboardNavigate?.({
				fromSlot,
				toSlot,
				key: event.key,
				shiftKey: event.shiftKey,
			})
		}

		return (
			<div
				data-schedule-grid-scroller
				on={{
					pointerleave: props.onCellHover
						? () => props.onCellHover?.(null)
						: undefined,
				}}
				css={{
					border: `1px solid ${colors.border}`,
					borderRadius: radius.lg,
					width: fitToContent ? 'fit-content' : undefined,
					maxWidth: fitToContent ? '100%' : undefined,
					marginInline: fitToContent ? 'auto' : undefined,
					...(desktopHorizontalOverflow === 'local'
						? {
								overflowX: 'auto',
							}
						: {
								[mq.tablet]: {
									overflowX: 'auto',
								},
							}),
					backgroundColor: colors.surface,
					[mq.mobile]: compact
						? {
								borderRadius: 0,
								borderInline: 'none',
								overflowX: 'hidden',
							}
						: {},
				}}
			>
				<table
					css={{
						borderCollapse: 'separate',
						borderSpacing: 0,
						minWidth: fitToContent
							? `${timeColumnWidthRem + visibleDayKeys.length * dayColumnWidthRem}rem`
							: compact
								? '100%'
								: `max(40rem, ${dayKeys.length * dayColumnWidthRem}rem)`,
						width: fitToContent ? 'max-content' : '100%',
						maxWidth: '100%',
						tableLayout: useNarrowDayColumns ? 'fixed' : undefined,
					}}
				>
					<caption css={visuallyHiddenCss}>{tableCaption}</caption>
					<thead>
						<tr>
							<th
								scope="col"
								css={{
									position: 'sticky',
									left: 0,
									top: 0,
									zIndex: 3,
									backgroundColor: colors.surface,
									padding: `${spacing.sm} ${spacing.sm}`,
									textAlign: 'left',
									fontSize: typography.fontSize.sm,
									color: colors.textMuted,
									borderBottom: `1px solid ${colors.border}`,
									borderRight: `1px solid ${colors.border}`,
									width: `${timeColumnWidthRem}rem`,
									minWidth: `${timeColumnWidthRem}rem`,
									maxWidth: `${timeColumnWidthRem}rem`,
									[mq.mobile]: compact
										? {
												minWidth: '4.8rem',
												maxWidth: '4.8rem',
												width: '4.8rem',
												paddingInline: spacing.xs,
											}
										: {},
								}}
							>
								Time
							</th>
							{visibleDayKeys.map((dayKey, dayColumnIndex) => {
								const hasWeekSeparator =
									props.showWeekSeparators &&
									dayColumnIndex > 0 &&
									isStartOfWeek(dayKey)
								const stackedDayHeader = useStackedDayHeader
									? formatStackedDayHeader(dayKey, dayLabels[dayKey] ?? dayKey)
									: null
								return (
									<th
										key={dayKey}
										scope="col"
										css={{
											position: 'sticky',
											top: 0,
											zIndex: 2,
											backgroundColor: colors.surface,
											padding: useNarrowDayColumns
												? `${spacing.xs} ${spacing.xs}`
												: `${spacing.sm} ${spacing.sm}`,
											textAlign: 'center',
											fontSize: typography.fontSize.sm,
											color: colors.text,
											borderBottom: `1px solid ${colors.border}`,
											width: useNarrowDayColumns ? '6.2rem' : undefined,
											borderLeft: hasWeekSeparator
												? `${weekSeparatorWidth} solid ${colors.surface}`
												: undefined,
										}}
									>
										{stackedDayHeader ? (
											<span
												css={{
													display: 'grid',
													justifyItems: 'center',
													gap: '0.1rem',
													lineHeight: 1.15,
												}}
											>
												<span>{stackedDayHeader.monthDay}</span>
												<span
													css={{
														fontSize: typography.fontSize.xs,
														color: colors.textMuted,
													}}
												>
													{stackedDayHeader.weekday}
												</span>
											</span>
										) : (
											dayLabels[dayKey]
										)}
									</th>
								)
							})}
						</tr>
					</thead>
					<tbody>
						{timeKeys.map((timeKey) => (
							<tr key={timeKey}>
								<th
									scope="row"
									css={{
										position: 'sticky',
										left: 0,
										zIndex: 1,
										backgroundColor: colors.surface,
										padding: `${spacing.xs} ${spacing.sm}`,
										fontSize: typography.fontSize.xs,
										color: colors.textMuted,
										borderRight: `1px solid ${colors.border}`,
										borderBottom: `1px solid ${colors.border}`,
										textAlign: 'left',
										fontWeight: typography.fontWeight.medium,
										width: `${timeColumnWidthRem}rem`,
										minWidth: `${timeColumnWidthRem}rem`,
										maxWidth: `${timeColumnWidthRem}rem`,
									}}
								>
									{timeLabels[timeKey]}
								</th>
								{visibleDayKeys.map((dayKey, dayColumnIndex) => {
									const slot = cellByDayAndTime[dayKey]?.[timeKey] ?? null
									const hasWeekSeparator =
										props.showWeekSeparators &&
										dayColumnIndex > 0 &&
										isStartOfWeek(dayKey)
									if (!slot) {
										const missingSlotExplanation = `No slot at ${timeLabels[timeKey]} on ${dayLabels[dayKey]}. This can happen around daylight-saving transitions or at schedule range boundaries.`
										return (
											<td
												key={`${dayKey}:${timeKey}:empty`}
												data-missing-slot-cell="true"
												title={missingSlotExplanation}
												css={{
													padding: 0,
													borderBottom: `1px solid ${colors.border}`,
													borderRight: `1px solid ${colors.border}`,
													borderLeft: hasWeekSeparator
														? `${weekSeparatorWidth} solid ${colors.surface}`
														: undefined,
													backgroundColor:
														'color-mix(in srgb, var(--color-background) 88%, var(--color-surface))',
													height: '2.25rem',
													[mq.mobile]: compact
														? {
																height: '2.65rem',
															}
														: {},
												}}
											>
												<span
													aria-label={missingSlotExplanation}
													css={{
														display: 'grid',
														placeItems: 'center',
														minHeight: '2.25rem',
														color: colors.textMuted,
														fontSize: typography.fontSize.xs,
														fontWeight: typography.fontWeight.medium,
														letterSpacing: '0.04em',
														userSelect: 'none',
														[mq.mobile]: compact
															? {
																	minHeight: '2.65rem',
																}
															: {},
													}}
												>
													N/A
												</span>
											</td>
										)
									}

									const availability = props.slotAvailability[slot] ?? {
										count: 0,
										availableNames: [],
									}
									const isSelected = props.selectedSlots.has(slot)
									const isDisabled = props.disabledSlots?.has(slot) ?? false
									const isHighlighted =
										props.highlightedSlots?.has(slot) ?? false
									const isPendingSelection =
										props.selectionSlots?.has(slot) ?? false
									const isOutlined = props.outlinedSlots?.has(slot) ?? false
									const isAccented = props.accentedSlots?.has(slot) ?? false
									const isRangeAnchor = props.rangeAnchor === slot
									const isActive = props.activeSlot === slot
									const background = getCellBackground({
										count: availability.count,
										maxCount: props.maxAvailabilityCount,
										isSelected,
										isDisabled,
										isHighlighted,
										selectedBackground: props.selectedBackground,
									})
									const slotLabel = formatSlotLabel(slot, 'long')
									const availabilitySelectionLabel = toSelectionLabel({
										selected: isSelected,
										selectedSlotLabel: props.selectedSlotLabel,
										unselectedSlotLabel: props.unselectedSlotLabel,
									})
									const attendeeLabel =
										availability.count > 0
											? `${availability.count} attendee${availability.count === 1 ? '' : 's'} available`
											: 'no attendees available'
									const attendeeNamesLabel =
										availability.availableNames.length === 0
											? ''
											: availability.availableNames.length <= 3
												? `, available attendees: ${availability.availableNames.join(', ')}`
												: `, available attendees include ${availability.availableNames
														.slice(0, 3)
														.join(', ')}, and ${
														availability.availableNames.length - 3
													} more`
									const highlightedLabel =
										isHighlighted && props.highlightedSlotLabel
											? `, ${props.highlightedSlotLabel}`
											: ''
									const pendingSelectionLabel =
										isPendingSelection && props.selectionSlotLabel
											? `, ${props.selectionSlotLabel}`
											: isPendingSelection
												? ', included in pending selection'
												: ''
									const disabledLabel = isDisabled
										? ', unavailable for scheduling'
										: ''
									const outlinedSelectionLabel =
										isOutlined && props.outlinedSlotLabel
											? `, ${props.outlinedSlotLabel}`
											: isOutlined
												? ', selected range'
												: ''
									const accentedSelectionLabel =
										isAccented && props.accentedSlotLabel
											? `, ${props.accentedSlotLabel}`
											: isAccented
												? ', highlighted for focused attendee'
												: ''
									const ariaLabel = `${slotLabel}, ${availabilitySelectionLabel}, ${attendeeLabel}${attendeeNamesLabel}${highlightedLabel}${pendingSelectionLabel}${outlinedSelectionLabel}${accentedSelectionLabel}${disabledLabel}`
									const interactive = !props.readOnly && !isDisabled
									const pendingSelectionOverlay = isPendingSelection
										? `inset 0 0 0 999px color-mix(in srgb, ${colors.primary} 14%, transparent)`
										: null
									const accentedSlotRing = isAccented
										? `inset 0 0 0 2px ${colors.success}`
										: null
									const outlinedSlotRing =
										isOutlined && !isAccented
											? `inset 0 0 0 2px ${colors.primary}`
											: null
									const activeSlotRing =
										isRangeAnchor || isActive
											? `inset 0 0 0 2px ${colors.primary}`
											: null
									const combinedBoxShadow = [
										pendingSelectionOverlay,
										accentedSlotRing,
										outlinedSlotRing,
										activeSlotRing,
									]
										.filter((value): value is string => !!value)
										.join(', ')

									return (
										<td
											key={`${dayKey}:${timeKey}`}
											css={{
												padding: 0,
												borderBottom: `1px solid ${colors.border}`,
												borderRight: `1px solid ${colors.border}`,
												borderLeft: hasWeekSeparator
													? `${weekSeparatorWidth} solid ${colors.surface}`
													: undefined,
											}}
										>
											<button
												type="button"
												data-slot={slot}
												aria-label={ariaLabel}
												aria-pressed={
													props.readOnly || isDisabled ? undefined : isSelected
												}
												aria-disabled={isDisabled ? 'true' : undefined}
												title={`${slotLabel}\n${attendeeLabel}${isDisabled ? '\nUnavailable for scheduling' : ''}`}
												css={{
													display: 'grid',
													placeItems: 'center',
													position: 'relative',
													width: '100%',
													minHeight: '2.25rem',
													padding: spacing.xs,
													border: 'none',
													background,
													backgroundImage: isDisabled
														? 'repeating-linear-gradient(135deg, color-mix(in srgb, var(--color-text) 11%, transparent) 0 5px, transparent 5px 10px)'
														: undefined,
													color: colors.text,
													cursor:
														props.readOnly || isDisabled
															? 'default'
															: 'pointer',
													fontSize: typography.fontSize.xs,
													fontWeight: typography.fontWeight.medium,
													boxShadow: combinedBoxShadow || undefined,
													opacity: isDisabled ? 0.58 : 1,
													'&:focus-visible': {
														outline: `2px solid ${colors.primary}`,
														outlineOffset: '-2px',
													},
													[mq.mobile]: compact
														? {
																minHeight: '2.65rem',
																fontSize: typography.fontSize.sm,
															}
														: {},
												}}
												on={{
													pointerdown:
														interactive && props.onCellPointerDown
															? (event) =>
																	props.onCellPointerDown?.(slot, event)
															: undefined,
													pointerenter:
														interactive &&
														(props.onCellPointerEnter || props.onCellHover)
															? (event) => {
																	props.onCellPointerEnter?.(slot, event)
																	props.onCellHover?.(slot)
																}
															: props.onCellHover
																? () => props.onCellHover?.(slot)
																: undefined,
													pointermove: props.onCellPointerMove
														? (event) => props.onCellPointerMove?.(slot, event)
														: undefined,
													pointerleave: props.onCellHover
														? (event) => {
																if (!shouldClearHoverOnPointerLeave(event)) {
																	return
																}
																props.onCellHover?.(null)
															}
														: undefined,
													pointerup: props.onCellPointerUp
														? (event) => props.onCellPointerUp?.(slot, event)
														: undefined,
													click: props.onCellClick
														? (event) => props.onCellClick?.(slot, event)
														: undefined,
													focus: props.onCellFocus
														? () => props.onCellFocus?.(slot)
														: undefined,
													blur: props.onCellHover
														? () => props.onCellHover?.(null)
														: undefined,
													keydown: handleCellKeyDown,
												}}
											>
												<span css={{ position: 'relative', zIndex: 1 }}>
													{availability.count > 0 ? availability.count : ''}
												</span>
											</button>
										</td>
									)
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		)
	}

	if (dayKeys.length === 0 || timeKeys.length === 0) {
		return (
			<p css={{ color: colors.textMuted, margin: 0 }}>
				No time slots available for this range.
			</p>
		)
	}

	return (
		<div
			data-schedule-grid-shell
			css={{
				display: 'grid',
				gap: spacing.sm,
				opacity: props.pending ? 0.6 : 1,
				transition: 'opacity 120ms ease',
				[mq.mobile]: {
					marginInline: 'calc(50% - 50vw)',
				},
			}}
		>
			{hasMissingSlots ? (
				<p
					css={{
						margin: 0,
						color: colors.textMuted,
						fontSize: typography.fontSize.xs,
					}}
				>
					{missingSlotCellCount} cell{missingSlotCellCount === 1 ? '' : 's'}{' '}
					marked N/A because those local times have no slot in this schedule
					(for example daylight-saving transitions).
				</p>
			) : null}
			<div
				css={{
					display: 'none',
					[mq.mobile]: {
						display: 'grid',
						gap: spacing.sm,
					},
				}}
			>
				<div
					role="status"
					aria-live="polite"
					css={{
						position: 'sticky',
						top: 0,
						zIndex: 6,
						display: 'grid',
						gridTemplateColumns: 'auto minmax(0, 1fr) auto',
						alignItems: 'center',
						gap: spacing.sm,
						padding: `${spacing.xs} ${spacing.md}`,
						border: `1px solid ${colors.border}`,
						borderRadius: radius.md,
						backgroundColor: colors.surface,
						boxShadow:
							'0 6px 18px color-mix(in srgb, var(--color-text) 10%, transparent)',
					}}
				>
					<button
						type="button"
						disabled={!previousDayKey}
						aria-label="Show previous day"
						on={{
							click: () => {
								if (!previousDayKey) return
								props.onMobileDayChange?.(previousDayKey)
							},
						}}
						css={{
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: '2rem',
							height: '2rem',
							borderRadius: radius.full,
							border: `1px solid ${colors.border}`,
							backgroundColor: previousDayKey
								? colors.surface
								: colors.background,
							color: previousDayKey ? colors.text : colors.textMuted,
							fontSize: typography.fontSize.base,
							fontWeight: typography.fontWeight.bold,
							cursor: previousDayKey ? 'pointer' : 'not-allowed',
						}}
					>
						{'<'}
					</button>
					<div css={{ minWidth: 0, textAlign: 'center' }}>
						<p
							css={{
								margin: 0,
								color: colors.text,
								fontWeight: typography.fontWeight.semibold,
								fontSize: typography.fontSize.sm,
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
							}}
						>
							{resolvedMobileDayKey ? dayLabels[resolvedMobileDayKey] : ''}
						</p>
						<p
							css={{
								margin: 0,
								color: colors.textMuted,
								fontSize: typography.fontSize.xs,
							}}
						>
							Day {Math.max(1, mobileDayIndex + 1)} of {dayKeys.length}
						</p>
					</div>
					<button
						type="button"
						disabled={!nextDayKey}
						aria-label="Show next day"
						on={{
							click: () => {
								if (!nextDayKey) return
								props.onMobileDayChange?.(nextDayKey)
							},
						}}
						css={{
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: '2rem',
							height: '2rem',
							borderRadius: radius.full,
							border: `1px solid ${colors.border}`,
							backgroundColor: nextDayKey ? colors.surface : colors.background,
							color: nextDayKey ? colors.text : colors.textMuted,
							fontSize: typography.fontSize.base,
							fontWeight: typography.fontWeight.bold,
							cursor: nextDayKey ? 'pointer' : 'not-allowed',
						}}
					>
						{'>'}
					</button>
				</div>
			</div>
			<div
				css={{
					display: 'grid',
					[mq.mobile]: {
						display: 'none',
					},
				}}
			>
				{renderGridTable(desktopVisibleDayKeys, false)}
			</div>
			<div
				css={{
					display: 'none',
					[mq.mobile]: {
						display: 'grid',
					},
				}}
			>
				{renderGridTable(mobileVisibleDayKeys, true)}
			</div>
		</div>
	)
}

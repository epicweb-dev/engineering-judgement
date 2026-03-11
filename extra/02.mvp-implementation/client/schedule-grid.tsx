import { colors, radius, spacing, typography } from '#client/styles/tokens.ts'

export type GridSlot = {
	id: string
	startsAtUtc: string
}

type GridModel = {
	days: Array<{ key: string; label: string }>
	times: Array<{ minutes: number; label: string }>
	slotByCoordinate: Map<string, GridSlot>
	coordinatesBySlot: Map<string, { dayIndex: number; timeIndex: number }>
}

function coordinateKey(dayKey: string, minutes: number) {
	return `${dayKey}::${minutes}`
}

function getTimeParts(date: Date, timeZone: string) {
	const partsFormatter = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	})
	const parts = partsFormatter.formatToParts(date)
	const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
	const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
	const label = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hour: 'numeric',
		minute: '2-digit',
		hourCycle: 'h23',
	}).format(date)
	return {
		minutes: hour * 60 + minute,
		label,
	}
}

export function createGridModel(
	slots: ReadonlyArray<GridSlot>,
	displayTimeZone: string,
) {
	const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: displayTimeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	})
	const dayLabelFormatter = new Intl.DateTimeFormat('en-US', {
		timeZone: displayTimeZone,
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	})

	const dayLabels = new Map<string, string>()
	const timeLabels = new Map<number, string>()
	const slotByCoordinate = new Map<string, GridSlot>()

	for (const slot of slots) {
		const date = new Date(slot.startsAtUtc)
		const dayKey = dayKeyFormatter.format(date)
		const dayLabel = dayLabelFormatter.format(date)
		const time = getTimeParts(date, displayTimeZone)
		dayLabels.set(dayKey, dayLabel)
		timeLabels.set(time.minutes, time.label)
		slotByCoordinate.set(coordinateKey(dayKey, time.minutes), slot)
	}

	const days = [...dayLabels.entries()]
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([key, label]) => ({ key, label }))
	const times = [...timeLabels.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([minutes, label]) => ({ minutes, label }))

	const dayIndexByKey = new Map(days.map((day, index) => [day.key, index]))
	const timeIndexByMinute = new Map(
		times.map((time, index) => [time.minutes, index]),
	)
	const coordinatesBySlot = new Map<string, { dayIndex: number; timeIndex: number }>()

	for (const slot of slots) {
		const date = new Date(slot.startsAtUtc)
		const dayKey = dayKeyFormatter.format(date)
		const time = getTimeParts(date, displayTimeZone)
		const dayIndex = dayIndexByKey.get(dayKey)
		const timeIndex = timeIndexByMinute.get(time.minutes)
		if (dayIndex === undefined || timeIndex === undefined) continue
		coordinatesBySlot.set(slot.id, { dayIndex, timeIndex })
	}

	return {
		days,
		times,
		slotByCoordinate,
		coordinatesBySlot,
	} satisfies GridModel
}

export function collectRangeSlotIds(
	model: ReturnType<typeof createGridModel>,
	anchorSlotId: string,
	targetSlotId: string,
) {
	const anchor = model.coordinatesBySlot.get(anchorSlotId)
	const target = model.coordinatesBySlot.get(targetSlotId)
	if (!anchor || !target) return []

	const minDay = Math.min(anchor.dayIndex, target.dayIndex)
	const maxDay = Math.max(anchor.dayIndex, target.dayIndex)
	const minTime = Math.min(anchor.timeIndex, target.timeIndex)
	const maxTime = Math.max(anchor.timeIndex, target.timeIndex)
	const slotIds: Array<string> = []

	for (let dayIndex = minDay; dayIndex <= maxDay; dayIndex += 1) {
		const day = model.days[dayIndex]
		if (!day) continue
		for (let timeIndex = minTime; timeIndex <= maxTime; timeIndex += 1) {
			const time = model.times[timeIndex]
			if (!time) continue
			const slot = model.slotByCoordinate.get(coordinateKey(day.key, time.minutes))
			if (slot) slotIds.push(slot.id)
		}
	}

	return slotIds
}

export function renderScheduleGrid({
	model,
	selectedSlotIds,
	anchorSlotId,
	readOnly = false,
	ariaLabel = 'Schedule availability grid',
	onCellClick,
	onCellMouseDown,
	onCellMouseEnter,
	onHandlePointerDown,
	onHandlePointerMove,
	onHandlePointerUp,
}: {
	model: ReturnType<typeof createGridModel>
	selectedSlotIds: ReadonlySet<string>
	anchorSlotId: string | null
	readOnly?: boolean
	ariaLabel?: string
	onCellClick: (slotId: string) => void
	onCellMouseDown: (event: MouseEvent, slotId: string) => void
	onCellMouseEnter: (slotId: string) => void
	onHandlePointerDown: (event: PointerEvent) => void
	onHandlePointerMove: (event: PointerEvent) => void
	onHandlePointerUp: (event: PointerEvent) => void
}) {
	if (model.days.length === 0 || model.times.length === 0) {
		return (
			<p css={{ margin: 0, color: colors.textMuted }}>
				No slots available for this date range.
			</p>
		)
	}

	return (
		<div
			data-schedule-grid="true"
			css={{
				overflow: 'auto',
				border: `1px solid ${colors.border}`,
				borderRadius: radius.md,
				backgroundColor: colors.surface,
				maxHeight: '24rem',
			}}
		>
			<table
				aria-label={ariaLabel}
				css={{
					width: '100%',
					borderCollapse: 'separate',
					borderSpacing: 0,
					minWidth: '34rem',
				}}
			>
				<thead>
					<tr>
						<th
							css={{
								position: 'sticky',
								top: 0,
								left: 0,
								zIndex: 3,
								textAlign: 'left',
								padding: `${spacing.xs} ${spacing.sm}`,
								backgroundColor: colors.surface,
								color: colors.textMuted,
								fontSize: typography.fontSize.xs,
								borderBottom: `1px solid ${colors.border}`,
							}}
						>
							Time
						</th>
						{model.days.map((day) => (
							<th
								key={day.key}
								css={{
									position: 'sticky',
									top: 0,
									zIndex: 2,
									padding: `${spacing.xs} ${spacing.sm}`,
									textAlign: 'center',
									backgroundColor: colors.surface,
									color: colors.text,
									fontSize: typography.fontSize.xs,
									fontWeight: typography.fontWeight.semibold,
									borderBottom: `1px solid ${colors.border}`,
								}}
							>
								{day.label}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{model.times.map((time) => (
						<tr key={String(time.minutes)}>
							<th
								scope="row"
								css={{
									position: 'sticky',
									left: 0,
									zIndex: 1,
									width: '5.2rem',
									textAlign: 'right',
									padding: `${spacing.xs} ${spacing.sm}`,
									fontSize: typography.fontSize.xs,
									color: colors.textMuted,
									backgroundColor: colors.surface,
									borderBottom: `1px solid ${colors.border}`,
								}}
							>
								{time.label}
							</th>
							{model.days.map((day) => {
								const slot = model.slotByCoordinate.get(
									coordinateKey(day.key, time.minutes),
								)
								return (
									<td
										key={`${day.key}-${time.minutes}`}
										css={{
											padding: spacing.xs,
											borderBottom: `1px solid ${colors.border}`,
											borderLeft: `1px solid ${colors.border}`,
											minWidth: '4.6rem',
										}}
									>
										{slot ? (
											<div css={{ position: 'relative' }}>
												<button
													type="button"
													data-slot-id={slot.id}
													disabled={readOnly}
													on={{
														click: () => onCellClick(slot.id),
														mousedown: (event) =>
															onCellMouseDown(event, slot.id),
														mouseenter: () => onCellMouseEnter(slot.id),
													}}
													css={{
														width: '100%',
														height: '2rem',
														border: selectedSlotIds.has(slot.id)
															? `2px solid ${colors.primaryText}`
															: `1px solid ${colors.border}`,
														backgroundColor: selectedSlotIds.has(slot.id)
															? colors.primarySoftHover
															: colors.surface,
														borderRadius: radius.sm,
														cursor: readOnly ? 'not-allowed' : 'pointer',
														padding: 0,
														margin: 0,
													}}
												/>
												{anchorSlotId === slot.id &&
												selectedSlotIds.has(slot.id) &&
												!readOnly ? (
													<button
														type="button"
														aria-label="Adjust selection"
														on={{
															pointerdown: onHandlePointerDown,
															pointermove: onHandlePointerMove,
															pointerup: onHandlePointerUp,
														}}
														css={{
															position: 'absolute',
															right: '-0.35rem',
															bottom: '-0.35rem',
															width: spacing.md,
															height: spacing.md,
															borderRadius: radius.full,
															border: `2px solid ${colors.onPrimary}`,
															backgroundColor: colors.primary,
															cursor: 'grab',
															zIndex: 2,
														}}
													/>
												) : null}
											</div>
										) : null}
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


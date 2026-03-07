import { type Handle } from 'remix/component'
import {
	colors,
	radius,
	spacing,
	typography,
} from '#client/styles/tokens.ts'
import { type SlotId } from '#shared/schedule-model.ts'
import { SelectionDragHandle } from './selection-drag-handle.tsx'

type TimeSlotCellSetup = {
	slotId: SlotId
	label: string
	selected: boolean
	disabled: boolean
	showDragHandle: boolean
	onToggle: (slotId: SlotId) => void
	onDragStart: (event: PointerEvent, slotId: SlotId) => void
}

export function TimeSlotCell(_handle: Handle, setup: TimeSlotCellSetup) {
	return () => (
		<button
			type="button"
			data-slot-id={setup.slotId}
			disabled={setup.disabled}
			on={{
				click: () => setup.onToggle(setup.slotId),
			}}
			css={{
				position: 'relative',
				minHeight: '2.75rem',
				borderRadius: radius.md,
				border: `1px solid ${setup.selected ? colors.primary : colors.border}`,
				backgroundColor: setup.selected ? colors.primarySoft : colors.surface,
				color: colors.text,
				display: 'grid',
				placeItems: 'center',
				fontSize: typography.fontSize.sm,
				fontWeight: typography.fontWeight.medium,
				padding: spacing.xs,
				cursor: setup.disabled ? 'not-allowed' : 'pointer',
				opacity: setup.disabled ? 0.45 : 1,
			}}
		>
			<span>{setup.label}</span>
			{setup.showDragHandle ? (
				<SelectionDragHandle
					setup={{
						onPointerDown: (event) => setup.onDragStart(event, setup.slotId),
					}}
				/>
			) : null}
		</button>
	)
}


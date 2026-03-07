import { type Handle } from 'remix/component'
import { colors } from '#client/styles/tokens.ts'

type SelectionDragHandleSetup = {
	onPointerDown: (event: PointerEvent) => void
}

export function SelectionDragHandle(
	_handle: Handle,
	setup: SelectionDragHandleSetup,
) {
	return () => (
		<span
			role="presentation"
			on={{
				pointerdown: setup.onPointerDown,
			}}
			css={{
				position: 'absolute',
				right: '-6px',
				bottom: '-6px',
				width: '12px',
				height: '12px',
				borderRadius: '999px',
				backgroundColor: colors.primary,
				border: `2px solid ${colors.surface}`,
				touchAction: 'none',
				cursor: 'grab',
			}}
		/>
	)
}


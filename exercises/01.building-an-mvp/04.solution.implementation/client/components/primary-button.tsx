import { type Handle } from 'remix/component'
import {
	colors,
	radius,
	spacing,
	transitions,
	typography,
} from '#client/styles/tokens.ts'

type PrimaryButtonSetup = {
	label: string
	disabled?: boolean
	type?: 'button' | 'submit'
	onClick?: () => void
}

export function PrimaryButton(_handle: Handle, setup: PrimaryButtonSetup) {
	return () => (
		<button
			type={setup.type ?? 'button'}
			disabled={setup.disabled}
			on={{
				click: () => setup.onClick?.(),
			}}
			css={{
				padding: `${spacing.sm} ${spacing.lg}`,
				borderRadius: radius.full,
				border: 'none',
				backgroundColor: colors.primary,
				color: colors.onPrimary,
				fontSize: typography.fontSize.base,
				fontWeight: typography.fontWeight.semibold,
				cursor: setup.disabled ? 'not-allowed' : 'pointer',
				opacity: setup.disabled ? 0.7 : 1,
				transition: `transform ${transitions.fast}, background-color ${transitions.normal}`,
				'&:hover': setup.disabled
					? undefined
					: {
							backgroundColor: colors.primaryHover,
							transform: 'translateY(-1px)',
						},
				'&:active': setup.disabled
					? undefined
					: {
							backgroundColor: colors.primaryActive,
							transform: 'translateY(0)',
						},
			}}
		>
			{setup.label}
		</button>
	)
}


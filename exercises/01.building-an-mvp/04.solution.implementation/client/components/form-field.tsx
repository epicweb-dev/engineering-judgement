import { type Handle } from 'remix/component'
import {
	colors,
	radius,
	spacing,
	typography,
} from '#client/styles/tokens.ts'

type FormFieldSetup = {
	label: string
	control: JSX.Element
	hint?: string | null
}

export function FormField(_handle: Handle, setup: FormFieldSetup) {
	return () => (
		<label css={{ display: 'grid', gap: spacing.xs }}>
			<span
				css={{
					color: colors.text,
					fontWeight: typography.fontWeight.medium,
					fontSize: typography.fontSize.sm,
				}}
			>
				{setup.label}
			</span>
			<div
				css={{
					'& input': {
						width: '100%',
						padding: `${spacing.sm} ${spacing.md}`,
						borderRadius: radius.md,
						border: `1px solid ${colors.border}`,
						fontSize: typography.fontSize.base,
						fontFamily: typography.fontFamily,
						backgroundColor: colors.surface,
						color: colors.text,
					},
				}}
			>
				{setup.control}
			</div>
			{setup.hint ? (
				<span css={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
					{setup.hint}
				</span>
			) : null}
		</label>
	)
}


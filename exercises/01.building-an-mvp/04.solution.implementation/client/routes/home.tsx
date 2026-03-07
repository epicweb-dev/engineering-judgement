import { type Handle } from 'remix/component'
import {
	colors,
	radius,
	shadows,
	spacing,
	typography,
} from '#client/styles/tokens.ts'

export function HomeRoute(_handle: Handle) {
	const isBrowser = typeof window !== 'undefined'
	const searchParams = isBrowser
		? new URLSearchParams(window.location.search)
		: new URLSearchParams()
	const errorMessage = searchParams.get('error')

	return () => (
		<section
			css={{
				display: 'grid',
				gap: spacing.lg,
			}}
		>
			<div
				css={{
					display: 'grid',
					gap: spacing.lg,
					padding: spacing.lg,
					borderRadius: radius.lg,
					border: `1px solid ${colors.border}`,
					background: `linear-gradient(135deg, ${colors.primarySoftStrong}, ${colors.primarySoftest})`,
					boxShadow: shadows.sm,
					maxWidth: '42rem',
					width: '100%',
				}}
			>
				<div
					css={{
						display: 'grid',
						gap: spacing.sm,
					}}
				>
					<h1
						css={{
							fontSize: typography.fontSize['2xl'],
							fontWeight: typography.fontWeight.semibold,
							margin: 0,
							color: colors.text,
						}}
					>
						Create a schedule in seconds
					</h1>
					<p css={{ margin: 0, color: colors.textMuted }}>
						No signup required. Share one participant link and keep management
						private with your host link.
					</p>
				</div>

				{errorMessage ? (
					<p
						role="alert"
						css={{
							margin: 0,
							padding: `${spacing.sm} ${spacing.md}`,
							borderRadius: radius.md,
							background: 'color-mix(in srgb, #dc2626 12%, white)',
							color: colors.error,
						}}
					>
						{errorMessage}
					</p>
				) : null}

				<form
					method="post"
					action="/events"
					css={{ display: 'grid', gap: spacing.md }}
				>
					<label css={{ display: 'grid', gap: spacing.xs }}>
						<span
							css={{
								fontWeight: typography.fontWeight.medium,
								color: colors.text,
							}}
						>
							Event title
						</span>
						<input
							type="text"
							name="title"
							required
							maxLength={120}
							placeholder="Friday dinner plan"
							css={{
								border: `1px solid ${colors.border}`,
								borderRadius: radius.md,
								padding: spacing.sm,
								font: 'inherit',
							}}
						/>
					</label>

					<label css={{ display: 'grid', gap: spacing.xs }}>
						<span
							css={{
								fontWeight: typography.fontWeight.medium,
								color: colors.text,
							}}
						>
							Time options (one per line)
						</span>
						<textarea
							name="slots"
							required
							rows={6}
							placeholder={`Thu 7:00 PM\nFri 6:30 PM\nSat 1:00 PM`}
							css={{
								border: `1px solid ${colors.border}`,
								borderRadius: radius.md,
								padding: spacing.sm,
								font: 'inherit',
								resize: 'vertical',
							}}
						/>
					</label>

					<button
						type="submit"
						css={{
							border: `1px solid ${colors.primary}`,
							background: colors.primary,
							color: colors.onPrimary,
							borderRadius: radius.full,
							padding: `${spacing.sm} ${spacing.lg}`,
							fontWeight: typography.fontWeight.semibold,
							cursor: 'pointer',
							justifySelf: 'start',
						}}
					>
						Create schedule
					</button>
				</form>
			</div>
		</section>
	)
}

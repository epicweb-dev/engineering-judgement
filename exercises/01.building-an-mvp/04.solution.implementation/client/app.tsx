import { type Handle } from 'remix/component'
import { Router } from './client-router.tsx'
import { clientRoutes } from './routes/index.tsx'
import { colors, spacing, typography } from './styles/tokens.ts'

export function App(_handle: Handle) {
	return () => (
		<main
			css={{
				maxWidth: '64rem',
				margin: '0 auto',
				padding: spacing['2xl'],
				fontFamily: typography.fontFamily,
				display: 'grid',
				gap: spacing.lg,
			}}
		>
			<header css={{ display: 'grid', gap: spacing.xs }}>
				<a
					href="/"
					css={{
						color: colors.primaryText,
						fontWeight: typography.fontWeight.semibold,
						fontSize: typography.fontSize.lg,
						textDecoration: 'none',
					}}
				>
					epic-scheduler
				</a>
				<p css={{ margin: 0, color: colors.textMuted }}>
					Find the best time, share one link, finalize plans faster.
				</p>
			</header>
			<Router
				setup={{
					routes: clientRoutes,
					fallback: (
						<section>
							<h2
								css={{
									fontSize: typography.fontSize.lg,
									fontWeight: typography.fontWeight.semibold,
									margin: 0,
									color: colors.text,
								}}
							>
								Not Found
							</h2>
						</section>
					),
				}}
			/>
		</main>
	)
}

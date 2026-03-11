import { type BuildAction } from 'remix/fetch-router'
import { html } from 'remix/html-template'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'
import { getIndexStructuredData, toCanonicalUrl } from '#server/seo-content.ts'
import { type routes } from '#server/routes.ts'

export const home = {
	middleware: [],
	async action({ request }) {
		const canonicalUrl = toCanonicalUrl(request, '/')
		const fallback = html`<main class="seo-page">
			<section class="seo-section">
				<h1>Epic Scheduler</h1>
				<p>
					Create one link, paint availability in minutes, and choose meeting
					slots with confidence across timezones.
				</p>
				<ul>
					<li>Link-only participation (no attendee accounts)</li>
					<li>Realtime overlap heatmaps</li>
					<li>Attendee names per slot for clearer booking decisions</li>
				</ul>
				<p>
					<a href="/how-it-works">Learn how it works</a> ·
					<a href="/meeting-scheduler-features">Explore features</a> ·
					<a href="/blog">Read scheduling guides</a>
				</p>
			</section>
		</main>`
		return render(
			Layout({
				children: fallback,
				title: 'Epic Scheduler | Link-based meeting scheduler',
				description:
					'Plan meetings with less back-and-forth using paintable availability grids, live overlap heatmaps, and attendee-name visibility.',
				canonicalUrl,
				structuredData: getIndexStructuredData(canonicalUrl),
			}),
		)
	},
} satisfies BuildAction<typeof routes.home.method, typeof routes.home.pattern>

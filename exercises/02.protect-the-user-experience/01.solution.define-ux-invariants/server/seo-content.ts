import { html, type SafeHtml } from 'remix/html-template'

type SeoPage = {
	title: string
	description: string
	path: string
	body: SafeHtml
	structuredData?: Record<string, unknown> | Array<Record<string, unknown>>
}

type BlogPost = {
	slug: string
	title: string
	description: string
	publishedDate: string
	readingMinutes: number
	lede: string
	body: SafeHtml
}

export const canonicalPaths = {
	howItWorks: '/how-it-works',
	features: '/meeting-scheduler-features',
	blog: '/blog',
	privacy: '/privacy',
	terms: '/terms',
} as const

const blogPosts: Array<BlogPost> = [
	{
		slug: 'chatgpt-claude-mcp-availability-links',
		title: 'Use ChatGPT and Claude to answer availability links with MCP',
		description:
			'How to connect Epic Scheduler to ChatGPT and Claude through MCP so AI agents can submit availability from one shared link.',
		publishedDate: '2026-03-02',
		readingMinutes: 8,
		lede: 'Paste one scheduling link plus constraints, and an AI agent can submit your availability and summarize overlap windows.',
		body: html`<p>
				If someone sends you a scheduling link, you should be able to reply with
				your constraints once and let an agent do the rest. Epic Scheduler's MCP
				server makes that possible in both ChatGPT and Claude.
			</p>
			<p>
				This post covers the full setup and the practical workflow of asking an
				AI agent to respond to a specific availability link on your behalf.
			</p>
			<div class="seo-inline-demo">
				<img
					src="/blog/chatgpt-claude-mcp/epic-scheduler-home-page.png"
					alt="Epic Scheduler home page showing a paintable availability grid"
					loading="lazy"
					style="width: 100%; height: auto; border-radius: 0.5rem"
				/>
				<p class="seo-meta">
					Epic Scheduler host setup: one grid, one link, timezone-aware slots.
				</p>
			</div>
			<h2>Why this workflow matters</h2>
			<p>
				Most scheduling friction comes from context switching and repeated
				translation: "What timezone?", "Does Tuesday morning still work?", "Did
				you fill out the poll yet?" MCP removes that repetition by letting
				agents call scheduling tools directly.
			</p>
			<ul>
				<li>Share one scheduling URL.</li>
				<li>Describe your constraints in natural language.</li>
				<li>Let the agent submit and verify your availability.</li>
			</ul>
			<div class="seo-inline-demo">
				<img
					src="/blog/chatgpt-claude-mcp/epic-scheduler-share-link-page.png"
					alt="Epic Scheduler share link page with selected overlap slots"
					loading="lazy"
					style="width: 100%; height: auto; border-radius: 0.5rem"
				/>
				<p class="seo-meta">
					Each shared schedule is link-based, identified by
					<code>/s/:shareToken</code>.
				</p>
			</div>
			<h2>What Epic Scheduler exposes via MCP</h2>
			<p>
				Epic Scheduler serves MCP at <code>/mcp</code> and exposes tools for the
				core scheduling loop:
			</p>
			<ul>
				<li><code>create_schedule</code></li>
				<li><code>submit_schedule_availability</code></li>
				<li><code>get_schedule_snapshot</code></li>
				<li><code>open_schedule_ui</code> (MCP app widget)</li>
				<li><code>open_schedule_host_ui</code> (host MCP app widget)</li>
			</ul>
			<p>
				In other words: create a link, submit attendee slots, inspect overlap,
				repeat.
			</p>
			<h2>Validate tools in MCP Jam Inspector</h2>
			<p>
				Before connecting in ChatGPT or Claude, run a quick MCP Jam Inspector
				pass so you can confirm your server wiring and tool contracts.
			</p>
			<ol>
				<li>
					Start inspector and connect to <code>https://your-domain/mcp</code>.
				</li>
				<li>Confirm all scheduler tools are listed.</li>
				<li>Run <code>create_schedule</code> once and copy the share token.</li>
				<li>Use the same token in attendee and host app checks.</li>
			</ol>
			<div class="seo-inline-demo">
				<img
					src="/blog/chatgpt-claude-mcp/openai-connect-from-chatgpt-docs.png"
					alt="MCP Jam Inspector showing Epic Scheduler tools from a connected MCP server"
					loading="lazy"
					style="width: 100%; height: auto; border-radius: 0.5rem"
				/>
				<p class="seo-meta">
					MCP Jam Inspector with Epic Scheduler tools connected and ready.
				</p>
			</div>
			<h2>Validate host app routing and input propagation</h2>
			<p>
				Use <code>open_schedule_host_ui</code> with a share token and host
				access token, then verify the host app receives both values and loads
				the embedded dashboard route.
			</p>
			<ol>
				<li>
					Call <code>open_schedule_host_ui</code> with
					<code>shareToken</code> and <code>hostAccessToken</code>.
				</li>
				<li>
					Confirm the host widget shows the same token and host access token.
				</li>
				<li>
					Confirm the iframe loads
					<code>/s/{shareToken}/{hostAccessToken}</code>.
				</li>
				<li>Toggle a blocked slot to validate host-side controls.</li>
			</ol>
			<div class="seo-inline-demo">
				<img
					src="/blog/chatgpt-claude-mcp/claude-remote-mcp-docs.png"
					alt="Epic Scheduler host MCP app with share token propagation and loaded host dashboard"
					loading="lazy"
					style="width: 100%; height: auto; border-radius: 0.5rem"
				/>
				<p class="seo-meta">
					Host MCP app loaded from <code>open_schedule_host_ui</code>.
				</p>
			</div>
			<h2>The one-link prompt pattern</h2>
			<p>
				Once connected, you can give the model one link and one sentence of
				availability constraints:
			</p>
			<p>
				<em
					>Use Epic Scheduler to respond to this scheduling link as "Jordan
					Lee": https://your-domain/s/abc123. I am available Tue/Thu 9:00–11:30
					AM PT and Wed 1:00–3:00 PM PT. Submit my availability and summarize
					best overlap windows.</em
				>
			</p>
			<p>The agent should:</p>
			<ol>
				<li>Parse the share token from the URL.</li>
				<li>Load the schedule snapshot.</li>
				<li>Translate constraints into valid slot timestamps.</li>
				<li>Submit via <code>submit_schedule_availability</code>.</li>
				<li>Re-read overlap and report recommended windows.</li>
			</ol>
			<h2>Optional UI workflow via MCP Apps</h2>
			<p>
				If the host supports MCP Apps, <code>open_schedule_ui</code> can render
				a widget for creating links, submitting availability, and loading
				snapshots.
			</p>
			<div class="seo-inline-demo">
				<img
					src="/blog/chatgpt-claude-mcp/epic-scheduler-mcp-widget-page.png"
					alt="Epic Scheduler attendee MCP app widget with share token and attendee name prefilled"
					loading="lazy"
					style="width: 100%; height: auto; border-radius: 0.5rem"
				/>
				<p class="seo-meta">
					Attendee MCP app opened from <code>open_schedule_ui</code> with tool
					inputs already applied.
				</p>
			</div>
			<h2>Why teams love this workflow</h2>
			<ul>
				<li>
					<strong>Less back-and-forth:</strong> one shared link replaces long
					scheduling threads.
				</li>
				<li>
					<strong>Faster decisions:</strong> overlap summaries make the best
					windows obvious.
				</li>
				<li>
					<strong>Agent-ready:</strong> ChatGPT and Claude can act on the same
					MCP server and process.
				</li>
			</ul>
			<p>
				If your team coordinates meetings across timezones, Epic Scheduler gives
				you a practical speed boost: create once, share once, and let AI handle
				the repetitive scheduling mechanics.
			</p>`,
	},
	{
		slug: 'meeting-scheduler-for-remote-teams',
		title: 'A practical meeting scheduler for remote teams',
		description:
			'How to reduce scheduling back-and-forth with one link, shared overlap heatmaps, and clearer host decisions.',
		publishedDate: '2026-03-01',
		readingMinutes: 6,
		lede: 'Remote teams lose momentum in scheduling threads. A link-first workflow keeps discussion in one place and decisions faster.',
		body: html`<p>
				Remote teams rarely struggle with ideas. They struggle with coordination
				latency. A single planning meeting can trigger three timezone
				conversions, half a dozen “I can do later” replies, and one person who
				never sees the final thread.
			</p>
			<p>
				Epic Scheduler removes the thread overhead: the host paints availability
				once, shares one link, and attendees paint their windows with names.
			</p>
			<h2>What changes when scheduling is visual</h2>
			<ul>
				<li>
					<strong>Signal improves:</strong> overlap intensity tells you where
					consensus exists.
				</li>
				<li>
					<strong>Risk drops:</strong> attendee names are visible per slot, so
					you avoid accidental exclusions.
				</li>
				<li>
					<strong>Decision time shrinks:</strong> hosts can book directly from
					the heatmap without another poll round.
				</li>
			</ul>
			<h2>Process that works in small teams</h2>
			<ol>
				<li>Host sets interval and date range.</li>
				<li>Host paints realistic availability (not theoretical “all day”).</li>
				<li>Share one link in team chat.</li>
				<li>Attendees add names and paint windows.</li>
				<li>Host chooses a slot with best overlap and books externally.</li>
			</ol>
			<p>
				For 4–8 person groups, this is usually enough to avoid calendar
				integration complexity while still improving booking quality.
			</p>`,
	},
	{
		slug: 'timezone-overlap-without-calendar-chaos',
		title: 'Find timezone overlap without calendar chaos',
		description:
			'Simple habits for cross-timezone scheduling: UTC slot identity, paintable windows, and role clarity for hosts.',
		publishedDate: '2026-03-01',
		readingMinutes: 7,
		lede: 'Timezone confusion is usually a process problem, not a tooling problem. Use a few constraints and overlap gets easier.',
		body: html`<p>
				When people say “timezone scheduling is hard,” they usually mean “our
				process depends on text interpretation.” A better system uses explicit
				slots and shared visibility.
			</p>
			<h2>Rule 1: Keep slot identity in UTC</h2>
			<p>
				Epic Scheduler stores slot keys in UTC and translates for display. This
				prevents daylight-saving drift and avoids duplicated ambiguous times.
			</p>
			<h2>Rule 2: Paint windows, not vague preferences</h2>
			<p>
				“Morning works” is hard to action globally. Painted slots force concrete
				bounds and produce higher quality overlap.
			</p>
			<h2>Rule 3: Separate participation from decision ownership</h2>
			<p>
				Attendees contribute availability. Hosts choose final time. This avoids
				deadlocks where everyone waits for someone else to decide.
			</p>
			<h2>Rule 4: Use visual intensity for triage</h2>
			<p>
				Deep color means broader attendance. Start there, then inspect names for
				must-have participants before booking.
			</p>
			<p>
				You do not need a heavy meeting stack to make this work. A link, a grid,
				and clear ownership is enough for most async teams.
			</p>`,
	},
]

function renderMarketingNav(activePath: string) {
	const links = [
		{ href: '/', label: 'App' },
		{ href: canonicalPaths.howItWorks, label: 'How it works' },
		{ href: canonicalPaths.features, label: 'Features' },
		{ href: canonicalPaths.blog, label: 'Blog' },
		{ href: canonicalPaths.privacy, label: 'Privacy' },
		{ href: canonicalPaths.terms, label: 'Terms' },
	]

	return html`<nav class="seo-nav" aria-label="Site">
		<a class="seo-brand-link" href="/">
			<img src="/epic-scheduler-favicon.svg" alt="" aria-hidden="true" />
			<span>Epic Scheduler</span>
		</a>
		<div class="seo-nav-links">
			${links.map(
				(link) =>
					html`<a
						href="${link.href}"
						class="${activePath === link.href ? 'is-active' : ''}"
						>${link.label}</a
					>`,
			)}
		</div>
	</nav>`
}

function renderMarketingLayout(params: {
	activePath: string
	eyebrow?: string
	heading: string
	lede: string
	body: SafeHtml
	footerNote?: string
}) {
	return html`<main class="seo-page">
		${renderMarketingNav(params.activePath)}
		<header class="seo-hero">
			${params.eyebrow
				? html`<p class="seo-eyebrow">${params.eyebrow}</p>`
				: ''}
			<h1>${params.heading}</h1>
			<p>${params.lede}</p>
		</header>
		${params.body}
		<footer class="seo-footer">
			<p>
				${params.footerNote ??
				'Build schedules faster with a single link and shared overlap visibility.'}
			</p>
			<p>
				<a href="/">Create a scheduling link</a>
			</p>
		</footer>
	</main>`
}

export function getBlogPostBySlug(slug: string) {
	return blogPosts.find((post) => post.slug === slug) ?? null
}

export function getBlogPosts() {
	return blogPosts.slice()
}

export function getIndexStructuredData(baseUrl: string) {
	return [
		{
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: 'Epic Scheduler',
			url: baseUrl,
			description:
				'Link-based scheduling app for small groups coordinating across timezones.',
		},
		{
			'@context': 'https://schema.org',
			'@type': 'SoftwareApplication',
			name: 'Epic Scheduler',
			applicationCategory: 'BusinessApplication',
			operatingSystem: 'Web',
			url: baseUrl,
			offers: {
				'@type': 'Offer',
				price: '0',
				priceCurrency: 'USD',
			},
		},
	]
}

export function getHowItWorksPage(): SeoPage {
	return {
		title: 'How Epic Scheduler works | Link-based meeting coordination',
		description:
			'Learn how Epic Scheduler uses paintable availability grids, live overlap heatmaps, and attendee-name visibility to reduce scheduling friction.',
		path: canonicalPaths.howItWorks,
		structuredData: {
			'@context': 'https://schema.org',
			'@type': 'HowTo',
			name: 'Coordinate a meeting with Epic Scheduler',
			step: [
				{ '@type': 'HowToStep', text: 'Host defines range and interval.' },
				{ '@type': 'HowToStep', text: 'Host paints initial availability.' },
				{ '@type': 'HowToStep', text: 'Share one link with attendees.' },
				{
					'@type': 'HowToStep',
					text: 'Attendees add names and paint available slots.',
				},
				{
					'@type': 'HowToStep',
					text: 'Host picks slot with best overlap and books externally.',
				},
			],
		},
		body: renderMarketingLayout({
			activePath: canonicalPaths.howItWorks,
			eyebrow: 'Workflow',
			heading: 'How Epic Scheduler keeps coordination simple',
			lede: 'The goal is fewer messages and faster decisions. One link, visible overlap, and clear host ownership.',
			body: html`<section class="seo-section">
					<h2>Fast host setup</h2>
					<p>
						Select day range, choose 15/30/60-minute slots, and paint your own
						availability with click-drag or tap start/end.
					</p>
				</section>
				<section class="seo-section">
					<h2>Inline demo: overlap heatmap</h2>
					<p>
						This simplified preview mirrors how slot intensity maps to attendee
						overlap.
					</p>
					<div class="seo-inline-demo" role="img" aria-label="Heatmap preview">
						<div class="seo-demo-legend">
							<span>0</span>
							<span class="lv1">1</span>
							<span class="lv2">2</span>
							<span class="lv3">3+</span>
						</div>
						<div class="seo-demo-grid">
							<span class="lv0">8:00</span>
							<span class="lv1">9:00</span>
							<span class="lv2">10:00</span>
							<span class="lv3">11:00</span>
							<span class="lv1">12:00</span>
							<span class="lv0">13:00</span>
							<span class="lv2">14:00</span>
							<span class="lv3">15:00</span>
						</div>
					</div>
				</section>
				<section class="seo-section seo-card-grid">
					<article>
						<h3>Host clarity</h3>
						<p>
							Per-slot attendee names eliminate guesswork when selecting final
							times.
						</p>
					</article>
					<article>
						<h3>Attendee speed</h3>
						<p>
							No account creation. Open link, enter name, paint availability,
							done.
						</p>
					</article>
					<article>
						<h3>Realtime confidence</h3>
						<p>
							Updates sync instantly, with durable persistence to survive
							redeploys.
						</p>
					</article>
				</section>`,
		}),
	}
}

export function getFeaturesPage(): SeoPage {
	return {
		title: 'Meeting scheduler features for small teams',
		description:
			'Explore Epic Scheduler features: realtime shared availability, overlap heatmaps, mobile-friendly painting, and public MCP tooling.',
		path: canonicalPaths.features,
		body: renderMarketingLayout({
			activePath: canonicalPaths.features,
			eyebrow: 'Product',
			heading: 'Feature set built for low-friction scheduling',
			lede: 'Designed for hosts coordinating 4–8 people across timezones without heavy calendar integration.',
			body: html`<section class="seo-section">
					<h2>Core features</h2>
					<ul>
						<li>
							Host-created share links with configurable interval granularity
						</li>
						<li>
							Paintable availability grid with drag and tap-range interactions
						</li>
						<li>Realtime overlap updates powered by Durable Objects</li>
						<li>D1-backed persistence so data survives app restarts</li>
						<li>Color-coded slot intensity and per-slot attendee names</li>
						<li>
							Public MCP tools for schedule creation and availability updates
						</li>
					</ul>
				</section>
				<section class="seo-section">
					<h2>Inline demo: attendee slot visibility</h2>
					<div class="seo-inline-demo">
						<div class="seo-chip-row">
							<span class="seo-chip">Mon 09:30 — Alex, Jordan, Sam</span>
							<span class="seo-chip">Mon 10:00 — Alex, Priya</span>
							<span class="seo-chip">Mon 10:30 — Jordan, Priya, Sam</span>
						</div>
					</div>
				</section>
				<section class="seo-section">
					<h2>Use-case fit</h2>
					<p>
						Epic Scheduler fits teams that need better coordination now and
						don’t want to maintain account systems, OAuth integrations, or
						calendar sync complexity in v1.
					</p>
				</section>`,
		}),
	}
}

export function getBlogIndexPage(): SeoPage {
	return {
		title: 'Scheduling blog | Epic Scheduler',
		description:
			'Guides for reducing scheduling overhead, handling timezone overlap, and improving meeting coordination quality.',
		path: canonicalPaths.blog,
		structuredData: {
			'@context': 'https://schema.org',
			'@type': 'Blog',
			name: 'Epic Scheduler Blog',
			description:
				'Practical guides for low-friction scheduling and timezone coordination.',
		},
		body: renderMarketingLayout({
			activePath: canonicalPaths.blog,
			eyebrow: 'Resources',
			heading: 'Scheduling guides for practical teams',
			lede: 'Short, tactical reads for reducing meeting coordination overhead in distributed teams.',
			body: html`<section class="seo-section seo-blog-list">
				${blogPosts.map(
					(post) =>
						html`<article>
							<p class="seo-meta">
								${post.publishedDate} · ${post.readingMinutes} min read
							</p>
							<h2>
								<a href="/blog/${post.slug}">${post.title}</a>
							</h2>
							<p>${post.lede}</p>
						</article>`,
				)}
			</section>`,
		}),
	}
}

export function getBlogPostPage(slug: string): SeoPage | null {
	const post = getBlogPostBySlug(slug)
	if (!post) return null
	return {
		title: `${post.title} | Epic Scheduler Blog`,
		description: post.description,
		path: `/blog/${post.slug}`,
		structuredData: {
			'@context': 'https://schema.org',
			'@type': 'BlogPosting',
			headline: post.title,
			description: post.description,
			datePublished: post.publishedDate,
			author: {
				'@type': 'Organization',
				name: 'Epic Scheduler',
			},
		},
		body: renderMarketingLayout({
			activePath: canonicalPaths.blog,
			eyebrow: 'Blog',
			heading: post.title,
			lede: post.lede,
			body: html`<article class="seo-section seo-blog-post">
				<p class="seo-meta">
					${post.publishedDate} · ${post.readingMinutes} min read
				</p>
				${post.body}
				<p>
					<a href="/blog">Back to all posts</a>
				</p>
			</article>`,
			footerNote:
				'Want to apply this process immediately? Create a live scheduling link.',
		}),
	}
}

export function getPrivacyPage(): SeoPage {
	return {
		title: 'Privacy policy | Epic Scheduler',
		description:
			'Privacy policy for Epic Scheduler, including what data is stored, retention expectations, and service limitations.',
		path: canonicalPaths.privacy,
		body: renderMarketingLayout({
			activePath: canonicalPaths.privacy,
			eyebrow: 'Legal',
			heading: 'Privacy policy',
			lede: 'Epic Scheduler is intentionally minimal. We store only what is required to run shared scheduling links.',
			body: html`<section class="seo-section">
					<h2>What we collect</h2>
					<ul>
						<li>Schedule metadata (range, interval, share token)</li>
						<li>Attendee display names</li>
						<li>Availability selections per slot</li>
					</ul>
					<p>
						We do not run account signups and do not intentionally collect
						sensitive personal profile data in v1.
					</p>
				</section>
				<section class="seo-section">
					<h2>How data is used</h2>
					<p>
						Data is used only to display and synchronize scheduling availability
						for link participants.
					</p>
				</section>
				<section class="seo-section">
					<h2>Retention and deletion</h2>
					<p>
						We may delete schedules, reset storage, or discontinue the project
						at any time. Do not treat this service as archival storage.
					</p>
				</section>
				<section class="seo-section">
					<h2>No security guarantees</h2>
					<p>
						Reasonable effort is made, but no uptime, durability, or security
						SLA is guaranteed.
					</p>
				</section>`,
		}),
	}
}

export function getTermsPage(): SeoPage {
	return {
		title: 'Terms of service | Epic Scheduler',
		description:
			'Terms of service for Epic Scheduler. Service is provided as-is with no uptime guarantees and may be discontinued.',
		path: canonicalPaths.terms,
		body: renderMarketingLayout({
			activePath: canonicalPaths.terms,
			eyebrow: 'Legal',
			heading: 'Terms of service',
			lede: 'By using Epic Scheduler you agree that the service is experimental and provided as-is.',
			body: html`<section class="seo-section">
					<h2>Use at your own risk</h2>
					<p>
						The service is provided “as is,” with no guarantee of availability,
						error-free operation, or fitness for a specific purpose.
					</p>
				</section>
				<section class="seo-section">
					<h2>No uptime commitment</h2>
					<p>
						We may interrupt, change, or permanently shut down the project at
						any time without notice.
					</p>
				</section>
				<section class="seo-section">
					<h2>Data loss is possible</h2>
					<p>
						You acknowledge that schedules or attendee data may be removed,
						corrupted, or unavailable.
					</p>
				</section>
				<section class="seo-section">
					<h2>Acceptable use</h2>
					<p>
						Do not abuse the service with illegal activity, spam, or attempts to
						degrade availability for other users.
					</p>
				</section>`,
		}),
	}
}

export function getMarketingSitemapPaths() {
	return [
		'/',
		canonicalPaths.howItWorks,
		canonicalPaths.features,
		canonicalPaths.blog,
		...blogPosts.map((post) => `/blog/${post.slug}`),
		canonicalPaths.privacy,
		canonicalPaths.terms,
	]
}

export function toCanonicalUrl(request: Request, path: string) {
	const requestUrl = new URL(request.url)
	return new URL(path, requestUrl.origin).toString()
}

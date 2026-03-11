import { type BuildAction } from 'remix/fetch-router'
import { html } from 'remix/html-template'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'
import {
	getBlogIndexPage,
	getBlogPostPage,
	getFeaturesPage,
	getHowItWorksPage,
	getPrivacyPage,
	getTermsPage,
	toCanonicalUrl,
} from '#server/seo-content.ts'
import { type routes } from '#server/routes.ts'

function parseBlogSlug(pathname: string) {
	const segments = pathname.split('/').filter(Boolean)
	if (segments.length !== 2) return ''
	if (segments[0] !== 'blog') return ''
	return segments[1] ?? ''
}

function notFoundPage() {
	return html`<main class="seo-page">
		<section class="seo-section">
			<h1>Page not found</h1>
			<p>The page you requested does not exist.</p>
			<p><a href="/">Return to Epic Scheduler</a></p>
		</section>
	</main>`
}

export const howItWorks = {
	middleware: [],
	async action({ request }) {
		const page = getHowItWorksPage()
		return render(
			Layout({
				children: page.body,
				title: page.title,
				description: page.description,
				canonicalUrl: toCanonicalUrl(request, page.path),
				structuredData: page.structuredData,
				entryScripts: false,
			}),
		)
	},
} satisfies BuildAction<
	typeof routes.howItWorks.method,
	typeof routes.howItWorks.pattern
>

export const features = {
	middleware: [],
	async action({ request }) {
		const page = getFeaturesPage()
		return render(
			Layout({
				children: page.body,
				title: page.title,
				description: page.description,
				canonicalUrl: toCanonicalUrl(request, page.path),
				structuredData: page.structuredData,
				entryScripts: false,
			}),
		)
	},
} satisfies BuildAction<
	typeof routes.features.method,
	typeof routes.features.pattern
>

export const blogIndex = {
	middleware: [],
	async action({ request }) {
		const page = getBlogIndexPage()
		return render(
			Layout({
				children: page.body,
				title: page.title,
				description: page.description,
				canonicalUrl: toCanonicalUrl(request, page.path),
				structuredData: page.structuredData,
				entryScripts: false,
			}),
		)
	},
} satisfies BuildAction<typeof routes.blog.method, typeof routes.blog.pattern>

export const blogPost = {
	middleware: [],
	async action({ request, url }) {
		const slug = parseBlogSlug(url.pathname)
		const page = getBlogPostPage(slug)
		if (!page) {
			return render(
				Layout({
					children: notFoundPage(),
					title: 'Page not found | Epic Scheduler',
					description: 'Requested page was not found.',
					canonicalUrl: toCanonicalUrl(request, url.pathname),
					robots: 'noindex,nofollow',
					entryScripts: false,
				}),
				{ status: 404 },
			)
		}

		return render(
			Layout({
				children: page.body,
				title: page.title,
				description: page.description,
				canonicalUrl: toCanonicalUrl(request, page.path),
				structuredData: page.structuredData,
				ogType: 'article',
				entryScripts: false,
			}),
		)
	},
} satisfies BuildAction<
	typeof routes.blogPost.method,
	typeof routes.blogPost.pattern
>

export const privacy = {
	middleware: [],
	async action({ request }) {
		const page = getPrivacyPage()
		return render(
			Layout({
				children: page.body,
				title: page.title,
				description: page.description,
				canonicalUrl: toCanonicalUrl(request, page.path),
				entryScripts: false,
			}),
		)
	},
} satisfies BuildAction<
	typeof routes.privacy.method,
	typeof routes.privacy.pattern
>

export const terms = {
	middleware: [],
	async action({ request }) {
		const page = getTermsPage()
		return render(
			Layout({
				children: page.body,
				title: page.title,
				description: page.description,
				canonicalUrl: toCanonicalUrl(request, page.path),
				entryScripts: false,
			}),
		)
	},
} satisfies BuildAction<typeof routes.terms.method, typeof routes.terms.pattern>

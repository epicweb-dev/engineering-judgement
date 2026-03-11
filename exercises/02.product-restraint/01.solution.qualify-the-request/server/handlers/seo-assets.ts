import { type BuildAction } from 'remix/fetch-router'
import { getMarketingSitemapPaths } from '#server/seo-content.ts'
import { type routes } from '#server/routes.ts'

export const robotsTxt = {
	middleware: [],
	async action({ request }) {
		const url = new URL(request.url)
		const sitemapUrl = new URL('/sitemap.xml', url.origin).toString()
		const body = `User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`
		return new Response(body, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Cache-Control': 'public, max-age=3600',
			},
		})
	},
} satisfies BuildAction<
	typeof routes.robotsTxt.method,
	typeof routes.robotsTxt.pattern
>

export const sitemapXml = {
	middleware: [],
	async action({ request }) {
		const url = new URL(request.url)
		const pages = getMarketingSitemapPaths()
		const xml = [
			'<?xml version="1.0" encoding="UTF-8"?>',
			'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
			...pages.map((path) => {
				const loc = new URL(path, url.origin).toString()
				const priority =
					path === '/' ? '1.0' : path.startsWith('/blog/') ? '0.7' : '0.8'
				return `<url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>${priority}</priority></url>`
			}),
			'</urlset>',
		].join('')

		return new Response(xml, {
			headers: {
				'Content-Type': 'application/xml; charset=utf-8',
				'Cache-Control': 'public, max-age=3600',
			},
		})
	},
} satisfies BuildAction<
	typeof routes.sitemapXml.method,
	typeof routes.sitemapXml.pattern
>

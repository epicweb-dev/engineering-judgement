function normalizeRedirectTo(value: string | null) {
	if (!value) return null
	if (!value.startsWith('/')) return null
	if (value.startsWith('//')) return null
	return value
}

export function normalizeRedirectPath(
	value: string | null | undefined,
	fallback = '/account/schedules',
) {
	return normalizeRedirectTo(value ?? null) ?? fallback
}

export function redirectToLogin(
	request: Request,
	options: { redirectTo?: string } = {},
) {
	const requestUrl = new URL(request.url)
	const target = normalizeRedirectPath(
		options.redirectTo ?? `${requestUrl.pathname}${requestUrl.search}`,
		'/account/schedules',
	)
	const loginUrl = new URL('/login', requestUrl)
	loginUrl.searchParams.set('redirectTo', target)
	return Response.redirect(loginUrl, 302)
}

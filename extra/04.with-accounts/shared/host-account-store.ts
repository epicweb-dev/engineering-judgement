type PreparedStatementLike = {
	bind(...values: Array<unknown>): PreparedStatementLike
	run(): Promise<unknown>
	first<T = unknown>(): Promise<T | null>
	all<T = unknown>(): Promise<{ results: Array<T> }>
}

type D1DatabaseLike = {
	prepare(query: string): PreparedStatementLike
}

type UserRow = {
	id: string
	email: string
}

type HostLoginTokenRow = {
	id: string
	user_id: string
	email: string
	expires_at: string
}

export type HostScheduleSummary = {
	shareToken: string
	title: string
	createdAt: string
	claimedAt: string | null
}

const hostLoginTokenLifetimeMs = 15 * 60_000
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function toHex(bytes: Uint8Array) {
	return Array.from(bytes)
		.map((value) => value.toString(16).padStart(2, '0'))
		.join('')
}

function normalizeEmail(email: string) {
	return email.trim().toLowerCase()
}

function isValidEmailAddress(value: string) {
	return emailPattern.test(value)
}

export function createHostLoginToken() {
	return `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
}

export async function hashHostLoginToken(token: string) {
	const digest = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(token),
	)
	return toHex(new Uint8Array(digest))
}

export async function ensureHostUser(db: D1DatabaseLike, email: string) {
	const normalizedEmail = normalizeEmail(email)
	if (!normalizedEmail || !isValidEmailAddress(normalizedEmail)) {
		throw new Error('A valid email address is required.')
	}

	const existingUser = await db
		.prepare(
			`SELECT
				id,
				email
			FROM users
			WHERE email = ?1
			LIMIT 1`,
		)
		.bind(normalizedEmail)
		.first<UserRow>()
	if (existingUser) {
		return existingUser
	}

	const userId = crypto.randomUUID()
	await db
		.prepare(
			`INSERT INTO users (
				id,
				email,
				created_at,
				updated_at
			) VALUES (?1, ?2, ?3, ?3)`,
		)
		.bind(userId, normalizedEmail, new Date().toISOString())
		.run()

	return {
		id: userId,
		email: normalizedEmail,
	}
}

export async function createHostLoginRequest(
	db: D1DatabaseLike,
	input: { email: string },
) {
	const user = await ensureHostUser(db, input.email)
	const loginToken = createHostLoginToken()
	const loginTokenHash = await hashHostLoginToken(loginToken)
	const now = new Date()
	const expiresAt = new Date(now.getTime() + hostLoginTokenLifetimeMs).toISOString()

	await db
		.prepare(
			`INSERT INTO host_login_tokens (
				id,
				user_id,
				token_hash,
				expires_at,
				created_at
			) VALUES (?1, ?2, ?3, ?4, ?5)`,
		)
		.bind(crypto.randomUUID(), user.id, loginTokenHash, expiresAt, now.toISOString())
		.run()

	return {
		email: user.email,
		loginToken,
		expiresAt,
	}
}

export async function consumeHostLoginToken(
	db: D1DatabaseLike,
	providedLoginToken: string,
) {
	const normalizedLoginToken = providedLoginToken.trim()
	if (!normalizedLoginToken) {
		return { status: 'invalid' as const }
	}

	const loginTokenHash = await hashHostLoginToken(normalizedLoginToken)
	const tokenRow = await db
		.prepare(
			`SELECT
				host_login_tokens.id,
				host_login_tokens.user_id,
				users.email,
				host_login_tokens.expires_at
			FROM host_login_tokens
			INNER JOIN users ON users.id = host_login_tokens.user_id
			WHERE host_login_tokens.token_hash = ?1
			LIMIT 1`,
		)
		.bind(loginTokenHash)
		.first<HostLoginTokenRow>()

	if (!tokenRow) {
		return { status: 'invalid' as const }
	}

	await db
		.prepare(
			`DELETE FROM host_login_tokens
			WHERE id = ?1`,
		)
		.bind(tokenRow.id)
		.run()

	const expiresAtMs = Date.parse(tokenRow.expires_at)
	if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
		return { status: 'expired' as const }
	}

	return {
		status: 'valid' as const,
		session: {
			id: tokenRow.user_id,
			email: tokenRow.email,
		},
	}
}

export async function listSchedulesForHostUser(
	db: D1DatabaseLike,
	userId: string,
) {
	const rows = await db
		.prepare(
			`SELECT
				share_token,
				title,
				created_at,
				claimed_at
			FROM schedules
			WHERE owner_user_id = ?1
			ORDER BY COALESCE(claimed_at, created_at) DESC, created_at DESC`,
		)
		.bind(userId)
		.all<{
			share_token: string
			title: string
			created_at: string
			claimed_at: string | null
		}>()

	return rows.results.map((row) => ({
		shareToken: row.share_token,
		title: row.title,
		createdAt: row.created_at,
		claimedAt: row.claimed_at ?? null,
	})) satisfies Array<HostScheduleSummary>
}

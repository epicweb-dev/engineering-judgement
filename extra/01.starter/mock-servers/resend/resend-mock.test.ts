import { spawn, type ChildProcess } from 'node:child_process'
import { expect, test } from 'vitest'
import getPort from 'get-port'
import { setTimeout as delay } from 'node:timers/promises'
import { createTemporaryDirectory } from '#tools/temp-directory.ts'

const workerConfig = 'mock-servers/resend/wrangler.jsonc'
const projectRoot = process.cwd()
const defaultTimeoutMs = 60_000

type ManagedProcess = {
	process: ChildProcess
	exited: Promise<number>
	stdout: NodeJS.ReadableStream | null
	stderr: NodeJS.ReadableStream | null
	kill: (signal?: NodeJS.Signals) => void
}

function captureOutput(stream: NodeJS.ReadableStream | null) {
	let output = ''
	if (!stream) {
		return () => output
	}

	stream.on('data', (chunk) => {
		output += String(chunk)
	})
	return () => output
}

function formatOutput(stdout: string, stderr: string) {
	const snippets: Array<string> = []
	if (stdout.trim()) {
		snippets.push(`stdout: ${stdout.trim().slice(-2000)}`)
	}
	if (stderr.trim()) {
		snippets.push(`stderr: ${stderr.trim().slice(-2000)}`)
	}
	return snippets.length > 0 ? ` Output:\n${snippets.join('\n')}` : ''
}

async function waitForMockServer(
	origin: string,
	proc: ManagedProcess,
	getStdout: () => string,
	getStderr: () => string,
) {
	let exited = false
	let exitCode: number | null = null
	void proc.exited
		.then((code) => {
			exited = true
			exitCode = code
		})
		.catch(() => {
			exited = true
		})

	const metaUrl = new URL('/__mocks/meta', origin)
	const deadline = Date.now() + 25_000
	while (Date.now() < deadline) {
		if (exited) {
			throw new Error(
				`wrangler dev exited (${exitCode ?? 'unknown'}).${formatOutput(
					getStdout(),
					getStderr(),
				)}`,
			)
		}
		try {
			const response = await fetch(metaUrl)
			if (response.ok) {
				await response.body?.cancel()
				return
			}
		} catch {
			// Retry until the server is ready.
		}
		await delay(250)
	}

	throw new Error(
		`Timed out waiting for mock server at ${origin}.${formatOutput(
			getStdout(),
			getStderr(),
		)}`,
	)
}

async function stopProcess(proc: ManagedProcess) {
	let exited = false
	void proc.exited.then(() => {
		exited = true
	})
	proc.kill('SIGINT')
	await Promise.race([proc.exited, delay(5_000)])
	if (!exited) {
		proc.kill('SIGKILL')
		await proc.exited
	}
}

async function startMockResendWorker(persistDir: string, token: string) {
	const port = await getPort({ host: '127.0.0.1' })
	const inspectorPortBase =
		port + 10_000 <= 65_535 ? port + 10_000 : Math.max(1, port - 10_000)
	const inspectorPort = await getPort({
		host: '127.0.0.1',
		port: Array.from(
			{ length: 10 },
			(_, index) => inspectorPortBase + index,
		).filter((candidate) => candidate > 0 && candidate <= 65_535),
	})
	const origin = `http://127.0.0.1:${port}`
	const processHandle = createProcess([
		process.execPath,
		'./wrangler-env.ts',
		'dev',
		'--local',
		'--env',
		'test',
		'--config',
		workerConfig,
		'--var',
		`MOCK_API_TOKEN:${token}`,
		'--port',
		String(port),
		'--inspector-port',
		String(inspectorPort),
		'--ip',
		'127.0.0.1',
		'--persist-to',
		persistDir,
		'--show-interactive-dev-session=false',
		'--log-level',
		'error',
	])

	const getStdout = captureOutput(processHandle.stdout)
	const getStderr = captureOutput(processHandle.stderr)

	await waitForMockServer(origin, processHandle, getStdout, getStderr)

	return {
		origin,
		[Symbol.asyncDispose]: async () => {
			await stopProcess(processHandle)
		},
	}
}

function createProcess(args: Array<string>): ManagedProcess {
	const child = spawn(args[0]!, args.slice(1), {
		cwd: projectRoot,
		stdio: ['ignore', 'pipe', 'pipe'],
		env: {
			...process.env,
			CLOUDFLARE_ENV: 'test',
		},
	})
	const exited = new Promise<number>((resolve, reject) => {
		child.once('error', reject)
		child.once('exit', (code) => resolve(code ?? 1))
	})
	return {
		process: child,
		exited,
		stdout: child.stdout,
		stderr: child.stderr,
		kill: (signal) => {
			child.kill(signal)
		},
	}
}

test(
	'resend mock stores messages in D1 and exposes a count',
	async () => {
		await using tempDir = await createTemporaryDirectory('resend-mock-d1-')
		const token = 'test-mock-token'
		await using server = await startMockResendWorker(tempDir.path, token)

		const email = {
			to: 'alex@example.com',
			from: 'no-reply@example.com',
			subject: 'Reset your password',
			html: '<p>Reset link</p>',
		}

		const createResp = await fetch(new URL('/emails', server.origin), {
			method: 'POST',
			headers: {
				authorization: `Bearer ${token}`,
				'content-type': 'application/json',
			},
			body: JSON.stringify(email),
		})
		expect(createResp.status).toBe(200)
		const createJson = (await createResp.json()) as { id?: string }
		expect(typeof createJson.id).toBe('string')

		const metaResp = await fetch(new URL('/__mocks/meta', server.origin), {
			headers: { authorization: `Bearer ${token}` },
		})
		expect(metaResp.status).toBe(200)
		const metaJson = (await metaResp.json()) as {
			authorized: boolean
			messageCount?: number
		}
		expect(metaJson.authorized).toBe(true)
		expect(metaJson.messageCount).toBe(1)

		const listUrl = new URL('/__mocks/messages', server.origin)
		listUrl.searchParams.set('limit', '10')
		const listResp = await fetch(listUrl, {
			headers: { authorization: `Bearer ${token}` },
		})
		expect(listResp.status).toBe(200)
		const listJson = (await listResp.json()) as {
			count: number
			messages: Array<{
				id: string
				received_at: number
				from_email: string
				to_json: string
				subject: string
				html: string
				payload_json: string
			}>
		}
		expect(listJson.count).toBe(1)
		expect(listJson.messages[0]?.subject).toBe(email.subject)
		expect(listJson.messages[0]?.from_email).toBe(email.from)
		expect(JSON.parse(listJson.messages[0]?.to_json ?? 'null')).toEqual(
			email.to,
		)
		expect(listJson.messages[0]?.html).toBe(email.html)
		expect(JSON.parse(listJson.messages[0]?.payload_json ?? 'null')).toEqual(
			email,
		)
	},
	defaultTimeoutMs,
)

test(
	'resend mock rejects unauthenticated requests when a token is configured',
	async () => {
		await using tempDir = await createTemporaryDirectory('resend-mock-auth-')
		const token = 'test-mock-token'
		await using server = await startMockResendWorker(tempDir.path, token)

		const createResp = await fetch(new URL('/emails', server.origin), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				to: 'alex@example.com',
				from: 'no-reply@example.com',
				subject: 'hello',
				html: '<p>hi</p>',
			}),
		})
		expect(createResp.status).toBe(401)
	},
	defaultTimeoutMs,
)

test(
	'resend mock dashboard keeps token in endpoint links',
	async () => {
		await using tempDir = await createTemporaryDirectory(
			'resend-mock-dashboard-',
		)
		const token = 'test-mock-token'
		await using server = await startMockResendWorker(tempDir.path, token)

		const rootUrl = new URL('/', server.origin)
		rootUrl.searchParams.set('token', token)
		const rootResp = await fetch(rootUrl, { redirect: 'manual' })
		expect(rootResp.status).toBe(302)
		const expectedRedirectUrl = new URL('/__mocks', server.origin)
		expectedRedirectUrl.searchParams.set('token', token)
		expect(rootResp.headers.get('location')).toBe(
			expectedRedirectUrl.toString(),
		)

		const dashboardUrl = new URL('/__mocks', server.origin)
		dashboardUrl.searchParams.set('token', token)
		const dashboardResp = await fetch(dashboardUrl)
		expect(dashboardResp.status).toBe(200)
		const dashboardHtml = await dashboardResp.text()
		expect(dashboardHtml).toContain(`href="/__mocks/meta?token=${token}"`)
		expect(dashboardHtml).toContain(`href="/__mocks/messages?token=${token}"`)
	},
	defaultTimeoutMs,
)

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
	type CallToolResult,
	type ContentBlock,
} from '@modelcontextprotocol/sdk/types.js'
import getPort from 'get-port'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scheduleHostUiResourceUri } from '#shared/mcp-ui-resource-uris.ts'
import { expect, test } from 'vitest'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const defaultTimeoutMs = 60_000
const scheduleUiResourceUri = 'ui://schedule-app/entry-point.html'
type SpawnedProcess = ReturnType<typeof spawn>

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runCommand(
	command: string,
	args: Array<string>,
	env?: Record<string, string>,
) {
	const proc = spawn(command, args, {
		cwd: projectRoot,
		stdio: ['ignore', 'pipe', 'pipe'],
		env: {
			...process.env,
			...env,
		},
	})
	const getStdout = captureOutput(proc.stdout)
	const getStderr = captureOutput(proc.stderr)
	const exitCode = await waitForExit(proc)
	const stdout = getStdout()
	const stderr = getStderr()
	if (exitCode !== 0) {
		throw new Error(
			`${command} ${args.join(' ')} failed (${exitCode}). ${stderr || stdout}`,
		)
	}
	return { stdout, stderr }
}

async function createTestDatabase() {
	const persistDir = await mkdtemp(join(tmpdir(), 'epic-scheduler-mcp-e2e-'))
	const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
	await runCommand(
		npmCommand,
		['run', '--silent', 'migrate:local', '--', '--persist-to', persistDir],
		{
			CLOUDFLARE_ENV: 'test',
		},
	)

	return {
		persistDir,
		[Symbol.asyncDispose]: async () => {
			await rm(persistDir, { recursive: true, force: true })
		},
	}
}

function captureOutput(stream: NodeJS.ReadableStream | null) {
	let output = ''
	if (!stream) {
		return () => output
	}

	stream.setEncoding('utf8')
	stream.on('data', (chunk: string) => {
		output += chunk
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

async function waitForServer(
	origin: string,
	proc: SpawnedProcess,
	getStdout: () => string,
	getStderr: () => string,
) {
	let exited = false
	let exitCode: number | null = null
	proc.once('exit', (code) => {
		exited = true
		exitCode = code
	})

	const metadataUrl = new URL('/health', origin)
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
			const response = await fetch(metadataUrl)
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
		`Timed out waiting for dev server at ${origin}.${formatOutput(
			getStdout(),
			getStderr(),
		)}`,
	)
}

async function stopProcess(proc: SpawnedProcess) {
	let exited = false
	proc.once('exit', () => {
		exited = true
	})
	proc.kill('SIGINT')
	await Promise.race([waitForExit(proc), delay(5_000)])
	if (!exited) {
		proc.kill('SIGKILL')
		await waitForExit(proc)
	}
}

async function startDevServer(persistDir: string) {
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
	const wranglerCommand = resolveWranglerCommand()
	const proc = spawn(
		wranglerCommand.command,
		wranglerCommand.args([
			'dev',
			'--local',
			'--env',
			'test',
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
		]),
		{
			cwd: projectRoot,
			stdio: ['ignore', 'pipe', 'pipe'],
			env: {
				...process.env,
				APP_BASE_URL: origin,
				CLOUDFLARE_ENV: 'test',
			},
		},
	)

	const getStdout = captureOutput(proc.stdout)
	const getStderr = captureOutput(proc.stderr)

	await waitForServer(origin, proc, getStdout, getStderr)

	return {
		origin,
		[Symbol.asyncDispose]: async () => {
			await stopProcess(proc)
		},
	}
}

function resolveWranglerCommand() {
	const localWranglerPath = resolve(
		projectRoot,
		'node_modules',
		'.bin',
		process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler',
	)
	if (existsSync(localWranglerPath)) {
		return {
			command: localWranglerPath,
			args: (args: Array<string>) => args,
		}
	}
	return {
		command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
		args: (args: Array<string>) => ['-y', 'wrangler', ...args],
	}
}

function waitForExit(child: SpawnedProcess) {
	return new Promise<number>((resolve, reject) => {
		if (child.exitCode !== null) {
			resolve(child.exitCode)
			return
		}
		child.once('error', reject)
		child.once('exit', (code) => resolve(code ?? 1))
	})
}

async function createMcpClient(origin: string) {
	const serverUrl = new URL('/mcp', origin)
	const transport = new StreamableHTTPClientTransport(serverUrl)
	const client = new Client(
		{ name: 'mcp-e2e', version: '1.0.0' },
		{ capabilities: {} },
	)

	await client.connect(transport)

	return {
		client,
		[Symbol.asyncDispose]: async () => {
			await client.close()
		},
	}
}

test(
	'mcp server lists scheduler tools',
	async () => {
		await using database = await createTestDatabase()
		await using server = await startDevServer(database.persistDir)
		await using mcpClient = await createMcpClient(server.origin)

		const result = await mcpClient.client.listTools()
		const toolNames = result.tools.map((tool) => tool.name)

		expect(toolNames.sort()).toEqual([
			'create_schedule',
			'get_schedule_snapshot',
			'open_schedule_host_ui',
			'open_schedule_ui',
			'submit_schedule_availability',
			'update_schedule_host_settings',
		])
	},
	defaultTimeoutMs,
)

test(
	'mcp server lists resources',
	async () => {
		await using database = await createTestDatabase()
		await using server = await startDevServer(database.persistDir)
		await using mcpClient = await createMcpClient(server.origin)

		const instructions = mcpClient.client.getInstructions() ?? ''
		expect(instructions).toContain('Quick start')

		const resourcesResult = await mcpClient.client.listResources()
		const resourceUris = resourcesResult.resources.map(
			(resource) => resource.uri,
		)

		expect(resourceUris).toContain(scheduleUiResourceUri)
		expect(resourceUris).toContain(scheduleHostUiResourceUri)
	},
	defaultTimeoutMs,
)

test(
	'mcp server creates and updates a schedule',
	async () => {
		await using database = await createTestDatabase()
		await using server = await startDevServer(database.persistDir)
		await using mcpClient = await createMcpClient(server.origin)

		const start = new Date('2026-03-02T00:00:00.000Z')
		const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)

		const createResult = await mcpClient.client.callTool({
			name: 'create_schedule',
			arguments: {
				title: 'MCP test schedule',
				hostName: 'Host',
				intervalMinutes: 60,
				rangeStartUtc: start.toISOString(),
				rangeEndUtc: end.toISOString(),
				selectedSlots: [start.toISOString()],
				disabledDays: ['saturday', 'sunday'],
			},
		})
		const createStructured = (createResult as CallToolResult)
			.structuredContent as Record<string, unknown> | undefined
		const shareToken =
			typeof createStructured?.shareToken === 'string'
				? createStructured.shareToken
				: ''
		const hostAccessToken =
			typeof createStructured?.hostAccessToken === 'string'
				? createStructured.hostAccessToken
				: ''
		expect(shareToken.length).toBeGreaterThan(4)
		expect(hostAccessToken.length).toBeGreaterThan(8)

		const createdSnapshotResult = await mcpClient.client.callTool({
			name: 'get_schedule_snapshot',
			arguments: {
				shareToken,
			},
		})
		const createdSnapshotStructured = (createdSnapshotResult as CallToolResult)
			.structuredContent as Record<string, unknown> | undefined
		expect(createdSnapshotStructured?.ok).toBe(true)
		const createdSnapshot = createdSnapshotStructured?.snapshot as
			| {
					blockedSlots?: Array<string>
			  }
			| undefined
		const createdBlockedSlots = Array.isArray(createdSnapshot?.blockedSlots)
			? createdSnapshot.blockedSlots
			: []
		expect(createdBlockedSlots.length).toBe(48)
		expect(
			createdBlockedSlots.every((slot) => {
				const day = new Date(slot).getUTCDay()
				return day === 0 || day === 6
			}),
		).toBe(true)

		const submitResult = await mcpClient.client.callTool({
			name: 'submit_schedule_availability',
			arguments: {
				shareToken,
				attendeeName: 'Alex',
				selectedSlots: [start.toISOString()],
			},
		})
		const submitStructured = (submitResult as CallToolResult)
			.structuredContent as Record<string, unknown> | undefined
		expect(submitStructured?.ok).toBe(true)

		const hostUpdateResult = await mcpClient.client.callTool({
			name: 'update_schedule_host_settings',
			arguments: {
				shareToken,
				hostAccessToken,
				title: 'Host-managed test schedule',
				blockedSlots: [start.toISOString()],
			},
		})
		const hostUpdateStructured = (hostUpdateResult as CallToolResult)
			.structuredContent as Record<string, unknown> | undefined
		expect(hostUpdateStructured?.ok).toBe(true)
		expect(hostUpdateStructured?.title).toBe('Host-managed test schedule')
		const hostUpdateBlockedSlots = Array.isArray(
			hostUpdateStructured?.blockedSlots,
		)
			? hostUpdateStructured.blockedSlots
			: []
		expect(hostUpdateBlockedSlots).toContain(start.toISOString())

		const snapshotResult = await mcpClient.client.callTool({
			name: 'get_schedule_snapshot',
			arguments: {
				shareToken,
			},
		})
		const snapshotStructured = (snapshotResult as CallToolResult)
			.structuredContent as Record<string, unknown> | undefined
		expect(snapshotStructured?.ok).toBe(true)
		const snapshot = snapshotStructured?.snapshot as
			| {
					schedule?: { title?: string }
					blockedSlots?: Array<string>
					countsBySlot?: Record<string, number>
					attendees?: Array<{ name?: string }>
			  }
			| undefined
		expect(snapshot?.schedule?.title).toBe('Host-managed test schedule')
		expect(snapshot?.blockedSlots ?? []).toContain(start.toISOString())
		expect(snapshot?.countsBySlot?.[start.toISOString()] ?? 0).toBe(0)
		const attendeeNames = (snapshot?.attendees ?? [])
			.map((attendee) => attendee.name)
			.filter((name): name is string => typeof name === 'string')
		expect(attendeeNames).toContain('Host')
		expect(attendeeNames).toContain('Alex')
	},
	defaultTimeoutMs,
)

test(
	'mcp server serves schedule ui resource',
	async () => {
		await using database = await createTestDatabase()
		await using server = await startDevServer(database.persistDir)
		await using mcpClient = await createMcpClient(server.origin)

		const result = await mcpClient.client.callTool({
			name: 'open_schedule_ui',
			arguments: {
				shareToken: 'demo-token',
				attendeeName: 'Alex',
			},
		})

		const structuredResult = (result as CallToolResult).structuredContent as
			| Record<string, unknown>
			| undefined
		expect(structuredResult?.widget).toBe('schedule')
		expect(structuredResult?.resourceUri).toBe(scheduleUiResourceUri)
		expect(structuredResult?.shareToken).toBe('demo-token')
		expect(structuredResult?.attendeeName).toBe('Alex')

		const textOutput =
			(result as CallToolResult).content.find(
				(item): item is Extract<ContentBlock, { type: 'text' }> =>
					item.type === 'text',
			)?.text ?? ''
		expect(textOutput).toContain('share token demo-token')

		const resourceResult = await mcpClient.client.readResource({
			uri: scheduleUiResourceUri,
		})
		const scheduleResource = resourceResult.contents.find(
			(content): content is { uri: string; mimeType?: string; text: string } =>
				content.uri === scheduleUiResourceUri &&
				'text' in content &&
				typeof content.text === 'string',
		)
		const scheduleResourceMeta = (
			resourceResult.contents.find(
				(content) => content.uri === scheduleUiResourceUri,
			) as { _meta?: Record<string, unknown> } | undefined
		)?._meta as
			| {
					ui?: {
						domain?: string
						csp?: {
							resourceDomains?: Array<string>
						}
					}
					'openai/widgetDomain'?: string
			  }
			| undefined

		expect(scheduleResource).toBeDefined()
		expect(scheduleResource?.mimeType).toBe('text/html;profile=mcp-app')
		expect(scheduleResource?.text).toContain('data-schedule-widget')
		expect(scheduleResource?.text).toContain('data-api-base-url="')
		expect(scheduleResource?.text).toContain('/mcp-apps/schedule-widget.js')
		expect(scheduleResource?.text).toContain('Your availability')
		expect(scheduleResource?.text).toContain(
			'Share token: <code data-share-token>',
		)
		expect(scheduleResource?.text).toContain('Waiting for share token input.')
		expect(scheduleResource?.text).toContain('Fullscreen')

		const scheduleWidgetResponse = await fetch(
			new URL('/mcp-apps/schedule-widget.js', server.origin),
		)
		expect(scheduleWidgetResponse.ok).toBe(true)
		expect(['*', null]).toContain(
			scheduleWidgetResponse.headers.get('access-control-allow-origin'),
		)
		const scheduleWidgetSource = await scheduleWidgetResponse.text()
		expect(scheduleWidgetSource).toContain('createWidgetHostBridge')
		expect(scheduleWidgetSource).toContain('/api/schedules')
		expect(scheduleWidgetSource).toContain('ui/request-display-mode')

		const scheduleHostWidgetResponse = await fetch(
			new URL('/mcp-apps/schedule-host-widget.js', server.origin),
		)
		expect(scheduleHostWidgetResponse.ok).toBe(true)
		expect(
			scheduleHostWidgetResponse.headers.get('access-control-allow-origin'),
		).toBe('*')
		const scheduleHostWidgetSource = await scheduleHostWidgetResponse.text()
		expect(scheduleHostWidgetSource).toContain('schedule-host-widget')
		expect(scheduleHostWidgetSource).toContain('/s/')

		const stylesResponse = await fetch(new URL('/styles.css', server.origin))
		expect(stylesResponse.ok).toBe(true)
		expect(['*', null]).toContain(
			stylesResponse.headers.get('access-control-allow-origin'),
		)

		const sandboxOrigin =
			'https://epic-scheduler-production-kentcdodds-workers-dev.web-sandbox.oaiusercontent.com'
		const apiPreflightResponse = await fetch(
			new URL('/api/schedules/demo-token/availability', server.origin),
			{
				method: 'OPTIONS',
				headers: {
					Origin: sandboxOrigin,
					'Access-Control-Request-Method': 'POST',
					'Access-Control-Request-Headers': 'content-type',
				},
			},
		)
		expect(apiPreflightResponse.status).toBe(204)
		expect(
			apiPreflightResponse.headers.get('access-control-allow-origin'),
		).toBe(sandboxOrigin)

		const apiBaseUrlMatch = scheduleResource?.text.match(
			/data-api-base-url="([^"]+)"/,
		)
		const widgetDomain = apiBaseUrlMatch?.[1]
			? new URL(apiBaseUrlMatch[1]).origin
			: undefined
		expect(widgetDomain).toBeDefined()
		expect(scheduleResourceMeta?.ui?.domain).toBe(widgetDomain)
		expect(scheduleResourceMeta?.['openai/widgetDomain']).toBe(widgetDomain)
		if (widgetDomain) {
			expect(scheduleResourceMeta?.ui?.csp?.resourceDomains).toContain(
				widgetDomain,
			)
		}
	},
	defaultTimeoutMs,
)

test(
	'mcp server serves schedule host ui resource',
	async () => {
		await using database = await createTestDatabase()
		await using server = await startDevServer(database.persistDir)
		await using mcpClient = await createMcpClient(server.origin)

		const result = await mcpClient.client.callTool({
			name: 'open_schedule_host_ui',
			arguments: {
				shareToken: 'demo-host-token',
				hostAccessToken: 'demo-host-access-token',
			},
		})
		const structuredResult = (result as CallToolResult).structuredContent as
			| Record<string, unknown>
			| undefined
		expect(structuredResult?.widget).toBe('schedule_host')
		expect(structuredResult?.resourceUri).toBe(scheduleHostUiResourceUri)
		expect(structuredResult?.shareToken).toBe('demo-host-token')
		expect(structuredResult?.hostAccessToken).toBe('demo-host-access-token')

		const resourceResult = await mcpClient.client.readResource({
			uri: scheduleHostUiResourceUri,
		})
		const hostResource = resourceResult.contents.find(
			(content): content is { uri: string; text: string } =>
				content.uri === scheduleHostUiResourceUri &&
				'text' in content &&
				typeof content.text === 'string',
		)
		expect(hostResource).toBeDefined()
		expect(hostResource?.text).toContain('Host dashboard')
		expect(hostResource?.text).toContain('/mcp-apps/schedule-host-widget.js')
		expect(hostResource?.text).toContain('data-api-base-url="')
		expect(hostResource?.text).toContain(
			'Waiting for share token and host access token input',
		)
	},
	defaultTimeoutMs,
)

import { DurableObject } from 'cloudflare:workers'
import {
	deleteAttendeeSubmission,
	renameAttendeeSubmission,
	upsertAttendeeAvailability,
} from '#shared/schedule-store.ts'
import { isRecordValue } from '#shared/record-utils.ts'

type BroadcastPayload = {
	type: string
	[key: string]: unknown
}

type AvailabilityUpdatePayload = {
	shareToken?: unknown
	name?: unknown
	attendeeTimeZone?: unknown
	selectedSlots?: unknown
}

type DeleteAvailabilityPayload = {
	shareToken?: unknown
	name?: unknown
}

type RenameAvailabilityPayload = {
	shareToken?: unknown
	currentName?: unknown
	nextName?: unknown
}

function isAvailabilityClientError(message: string) {
	return /(not found|required|invalid|must|range|interval)/i.test(message)
}

function isAvailabilityValidationError(message: string) {
	return /(required|invalid|must|range|interval)/i.test(message)
}

function isAvailabilityNotFoundError(message: string) {
	return /not found/i.test(message)
}

function isAvailabilityConflictError(message: string) {
	return /already exists/i.test(message)
}

function isAvailabilityForbiddenError(message: string) {
	return /host submission/i.test(message)
}

export class ScheduleRoom extends DurableObject<Env> {
	private sockets = new Set<WebSocket>()

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env)
	}

	async fetch(request: Request) {
		const url = new URL(request.url)

		if (
			request.method === 'GET' &&
			request.headers.get('Upgrade')?.toLowerCase() === 'websocket'
		) {
			const pair = new WebSocketPair()
			const client = pair[0]
			const server = pair[1]
			server.accept()
			this.sockets.add(server)
			server.addEventListener('close', () => {
				this.sockets.delete(server)
			})
			server.addEventListener('error', () => {
				this.sockets.delete(server)
			})
			server.send(JSON.stringify({ type: 'connected' }))
			return new Response(null, { status: 101, webSocket: client })
		}

		if (url.pathname === '/broadcast' && request.method === 'POST') {
			const payload = (await request
				.json()
				.catch(() => null)) as BroadcastPayload | null
			if (!payload || typeof payload.type !== 'string') {
				return Response.json(
					{ ok: false, error: 'Invalid broadcast payload.' },
					{ status: 400 },
				)
			}
			this.broadcast(payload)
			return Response.json({ ok: true })
		}

		if (url.pathname === '/availability' && request.method === 'POST') {
			let payload: AvailabilityUpdatePayload
			try {
				payload = (await request.json()) as AvailabilityUpdatePayload
			} catch {
				return Response.json(
					{ ok: false, error: 'Invalid JSON payload.' },
					{ status: 400 },
				)
			}
			if (!isRecordValue(payload)) {
				return Response.json(
					{ ok: false, error: 'Invalid JSON payload.' },
					{ status: 400 },
				)
			}

			const shareToken =
				typeof payload.shareToken === 'string' ? payload.shareToken : ''
			const name = typeof payload.name === 'string' ? payload.name : ''
			const attendeeTimeZone =
				typeof payload.attendeeTimeZone === 'string'
					? payload.attendeeTimeZone
					: ''
			const selectedSlots = Array.isArray(payload.selectedSlots)
				? payload.selectedSlots.filter(
						(slot): slot is string => typeof slot === 'string',
					)
				: []

			try {
				await upsertAttendeeAvailability(this.env.APP_DB, {
					shareToken,
					attendeeName: name,
					attendeeTimeZone,
					selectedSlots,
				})
				this.broadcast({
					type: 'schedule-updated',
					shareToken,
					updatedAt: new Date().toISOString(),
				})
				return Response.json({ ok: true })
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Unable to save availability.'
				if (isAvailabilityClientError(message)) {
					return Response.json({ ok: false, error: message }, { status: 400 })
				}

				console.error('schedule room availability update failed:', error)
				return Response.json(
					{ ok: false, error: 'Unable to save availability.' },
					{ status: 500 },
				)
			}
		}

		if (url.pathname === '/availability/delete' && request.method === 'POST') {
			let payload: DeleteAvailabilityPayload
			try {
				payload = (await request.json()) as DeleteAvailabilityPayload
			} catch {
				return Response.json(
					{ ok: false, error: 'Invalid JSON payload.' },
					{ status: 400 },
				)
			}
			if (!isRecordValue(payload)) {
				return Response.json(
					{ ok: false, error: 'Invalid JSON payload.' },
					{ status: 400 },
				)
			}

			const shareToken =
				typeof payload.shareToken === 'string' ? payload.shareToken : ''
			const name = typeof payload.name === 'string' ? payload.name : ''

			try {
				const result = await deleteAttendeeSubmission(this.env.APP_DB, {
					shareToken,
					attendeeName: name,
				})
				if (result.deleted) {
					this.broadcast({
						type: 'schedule-updated',
						shareToken,
						updatedAt: new Date().toISOString(),
					})
				}
				return Response.json({ ok: true, deleted: result.deleted })
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Unable to delete availability.'
				if (isAvailabilityNotFoundError(message)) {
					return Response.json({ ok: false, error: message }, { status: 404 })
				}
				if (isAvailabilityForbiddenError(message)) {
					return Response.json({ ok: false, error: message }, { status: 403 })
				}
				if (isAvailabilityValidationError(message)) {
					return Response.json({ ok: false, error: message }, { status: 400 })
				}

				console.error('schedule room availability delete failed:', error)
				return Response.json(
					{ ok: false, error: 'Unable to delete availability.' },
					{ status: 500 },
				)
			}
		}

		if (url.pathname === '/availability/rename' && request.method === 'POST') {
			let payload: RenameAvailabilityPayload
			try {
				payload = (await request.json()) as RenameAvailabilityPayload
			} catch {
				return Response.json(
					{ ok: false, error: 'Invalid JSON payload.' },
					{ status: 400 },
				)
			}
			if (!isRecordValue(payload)) {
				return Response.json(
					{ ok: false, error: 'Invalid JSON payload.' },
					{ status: 400 },
				)
			}

			const shareToken =
				typeof payload.shareToken === 'string' ? payload.shareToken : ''
			const currentName =
				typeof payload.currentName === 'string' ? payload.currentName : ''
			const nextName =
				typeof payload.nextName === 'string' ? payload.nextName : ''

			try {
				const result = await renameAttendeeSubmission(this.env.APP_DB, {
					shareToken,
					currentAttendeeName: currentName,
					nextAttendeeName: nextName,
				})
				if (result.renamed) {
					this.broadcast({
						type: 'schedule-updated',
						shareToken,
						updatedAt: new Date().toISOString(),
					})
				}
				return Response.json({ ok: true, renamed: result.renamed })
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Unable to rename availability submission.'
				if (isAvailabilityNotFoundError(message)) {
					return Response.json({ ok: false, error: message }, { status: 404 })
				}
				if (isAvailabilityForbiddenError(message)) {
					return Response.json({ ok: false, error: message }, { status: 403 })
				}
				if (isAvailabilityConflictError(message)) {
					return Response.json({ ok: false, error: message }, { status: 409 })
				}
				if (isAvailabilityValidationError(message)) {
					return Response.json({ ok: false, error: message }, { status: 400 })
				}

				console.error('schedule room availability rename failed:', error)
				return Response.json(
					{ ok: false, error: 'Unable to rename availability submission.' },
					{ status: 500 },
				)
			}
		}

		return Response.json({ ok: false, error: 'Not found.' }, { status: 404 })
	}

	private broadcast(payload: BroadcastPayload) {
		const message = JSON.stringify(payload)
		for (const socket of this.sockets) {
			try {
				socket.send(message)
			} catch {
				this.sockets.delete(socket)
			}
		}
	}
}

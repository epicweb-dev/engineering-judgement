import { type BuildAction } from 'remix/fetch-router'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'
import { type routes } from '#server/routes.ts'
import { type AppEnv } from '#types/env-schema.ts'
import {
	createDb,
	eventResponsesTable,
	eventsTable,
	eventSlotsTable,
} from '#worker/db.ts'

const maxTitleLength = 120
const maxParticipantNameLength = 60
const maxSlotCount = 12

type EventState = {
	event: {
		id: number
		title: string
		finalizedSlotId: number
	}
	slots: Array<{
		id: number
		label: string
		sortOrder: number
	}>
	responses: Array<{
		id: number
		slotId: number
		participantName: string
		participantKey: string
	}>
}

function parsePositiveInt(value: string) {
	if (!/^\d+$/.test(value)) return null
	const parsed = Number.parseInt(value, 10)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function readPathEventId(pathname: string, pattern: RegExp) {
	const match = pattern.exec(pathname)
	if (!match) return null
	const rawId = match[1]
	if (!rawId) return null
	return parsePositiveInt(rawId)
}

function normalizeTitle(value: FormDataEntryValue | null) {
	if (typeof value !== 'string') return ''
	return value.trim().replace(/\s+/g, ' ').slice(0, maxTitleLength)
}

function normalizeParticipantName(value: FormDataEntryValue | null) {
	if (typeof value !== 'string') return ''
	return value
		.trim()
		.replace(/\s+/g, ' ')
		.slice(0, maxParticipantNameLength)
}

function createParticipantKey(name: string) {
	return name.toLowerCase()
}

function parseSlotLabels(value: FormDataEntryValue | null) {
	if (typeof value !== 'string') return []
	const chunks = value.split('\n').flatMap((line) => line.split(','))
	const uniqueLabels = new Map<string, string>()
	for (const chunk of chunks) {
		const normalizedLabel = chunk.trim().replace(/\s+/g, ' ')
		if (!normalizedLabel) continue
		const normalizedKey = normalizedLabel.toLowerCase()
		if (uniqueLabels.has(normalizedKey)) continue
		uniqueLabels.set(normalizedKey, normalizedLabel)
		if (uniqueLabels.size >= maxSlotCount) break
	}
	return Array.from(uniqueLabels.values())
}

function parseSelectedSlotIds(formData: FormData) {
	const uniqueSlotIds = new Set<number>()
	for (const value of formData.getAll('slotIds')) {
		if (typeof value !== 'string') continue
		const parsed = parsePositiveInt(value)
		if (!parsed) continue
		uniqueSlotIds.add(parsed)
	}
	return Array.from(uniqueSlotIds)
}

function createRedirect(
	url: URL,
	pathname: string,
	params: Record<string, string | number>,
) {
	const destination = new URL(pathname, url)
	for (const [key, value] of Object.entries(params)) {
		destination.searchParams.set(key, String(value))
	}
	return Response.redirect(destination, 302)
}

async function loadEventState(db: ReturnType<typeof createDb>, eventId: number) {
	const eventRecord = await db.findOne(eventsTable, {
		where: { id: eventId },
	})
	if (!eventRecord) return null

	const slots = await db.findMany(eventSlotsTable, {
		where: { event_id: eventId },
		orderBy: ['sort_order', 'asc'],
	})
	const responses = await db.findMany(eventResponsesTable, {
		where: { event_id: eventId },
		orderBy: ['participant_name', 'asc'],
	})

	return {
		event: {
			id: eventRecord.id,
			title: eventRecord.title,
			finalizedSlotId: eventRecord.finalized_slot_id,
		},
		slots: slots.map((slot) => ({
			id: slot.id,
			label: slot.label,
			sortOrder: slot.sort_order,
		})),
		responses: responses.map((response) => ({
			id: response.id,
			slotId: response.slot_id,
			participantName: response.participant_name,
			participantKey: response.participant_key,
		})),
	} satisfies EventState
}

function buildVotes(eventState: EventState) {
	return eventState.slots.map((slot) => {
		const participants = eventState.responses
			.filter((response) => response.slotId === slot.id)
			.map((response) => response.participantName)
		return {
			slotId: slot.id,
			count: participants.length,
			participants,
		}
	})
}

function createHostKey() {
	return crypto.randomUUID().replaceAll('-', '')
}

function buildEventResponse(eventState: EventState) {
	const finalizedSlot =
		eventState.event.finalizedSlotId > 0
			? eventState.slots.find(
					(slot) => slot.id === eventState.event.finalizedSlotId,
				) ?? null
			: null
	return {
		ok: true,
		event: {
			id: eventState.event.id,
			title: eventState.event.title,
			finalizedSlotId: eventState.event.finalizedSlotId,
			finalizedSlotLabel: finalizedSlot?.label ?? null,
		},
		slots: eventState.slots,
		votes: buildVotes(eventState),
	}
}

export function createCreateEventHandler(appEnv: AppEnv) {
	const db = createDb(appEnv.APP_DB)

	return {
		middleware: [],
		async action({ request, url }) {
			const formData = await request.formData()
			const title = normalizeTitle(formData.get('title'))
			const slotLabels = parseSlotLabels(formData.get('slots'))

			if (!title || slotLabels.length < 2) {
				return createRedirect(url, '/', {
					error: 'Provide a title and at least two time options.',
				})
			}

			const hostKey = createHostKey()
			const createdEvent = await db.create(
				eventsTable,
				{
					title,
					host_key: hostKey,
					finalized_slot_id: 0,
				},
				{
					returnRow: true,
				},
			)

			for (const [index, slotLabel] of slotLabels.entries()) {
				await db.create(eventSlotsTable, {
					event_id: createdEvent.id,
					label: slotLabel,
					sort_order: index,
				})
			}

			return createRedirect(url, `/host/${createdEvent.id}`, {
				key: hostKey,
				created: 1,
			})
		},
	} satisfies BuildAction<
		typeof routes.createEvent.method,
		typeof routes.createEvent.pattern
	>
}

export const eventPage = {
	middleware: [],
	async action() {
		return render(
			Layout({
				title: 'Respond to schedule',
			}),
		)
	},
} satisfies BuildAction<
	typeof routes.eventPage.method,
	typeof routes.eventPage.pattern
>

export const hostPage = {
	middleware: [],
	async action() {
		return render(
			Layout({
				title: 'Host dashboard',
			}),
		)
	},
} satisfies BuildAction<typeof routes.hostPage.method, typeof routes.hostPage.pattern>

export function createEventDataHandler(appEnv: AppEnv) {
	const db = createDb(appEnv.APP_DB)

	return {
		middleware: [],
		async action({ url }) {
			const eventId = readPathEventId(url.pathname, /^\/events\/(\d+)\/data$/)
			if (!eventId) {
				return Response.json({ error: 'Not Found' }, { status: 404 })
			}
			const eventState = await loadEventState(db, eventId)
			if (!eventState) {
				return Response.json({ error: 'Event not found.' }, { status: 404 })
			}
			return Response.json(buildEventResponse(eventState))
		},
	} satisfies BuildAction<
		typeof routes.eventData.method,
		typeof routes.eventData.pattern
	>
}

export function createSubmitAvailabilityHandler(appEnv: AppEnv) {
	const db = createDb(appEnv.APP_DB)

	return {
		middleware: [],
		async action({ request, url }) {
			const eventId = readPathEventId(url.pathname, /^\/event\/(\d+)\/respond$/)
			if (!eventId) {
				return new Response('Not Found', { status: 404 })
			}

			const eventState = await loadEventState(db, eventId)
			if (!eventState) {
				return createRedirect(url, `/event/${eventId}`, {
					error: 'Event not found.',
				})
			}

			const formData = await request.formData()
			const participantName = normalizeParticipantName(
				formData.get('participantName'),
			)
			if (!participantName) {
				return createRedirect(url, `/event/${eventId}`, {
					error: 'Enter your name before submitting.',
				})
			}

			const participantKey = createParticipantKey(participantName)
			const selectedSlotIds = parseSelectedSlotIds(formData)
			const validSlotIds = new Set(eventState.slots.map((slot) => slot.id))
			const hasInvalidSlot = selectedSlotIds.some(
				(slotId) => !validSlotIds.has(slotId),
			)
			if (hasInvalidSlot) {
				return createRedirect(url, `/event/${eventId}`, {
					error: 'One or more selected options are invalid.',
				})
			}

			await db.deleteMany(eventResponsesTable, {
				where: {
					event_id: eventId,
					participant_key: participantKey,
				},
			})

			for (const slotId of selectedSlotIds) {
				await db.create(eventResponsesTable, {
					event_id: eventId,
					slot_id: slotId,
					participant_name: participantName,
					participant_key: participantKey,
				})
			}

			return createRedirect(url, `/event/${eventId}`, {
				saved: 1,
				name: participantName,
			})
		},
	} satisfies BuildAction<
		typeof routes.submitAvailability.method,
		typeof routes.submitAvailability.pattern
	>
}

export function createHostDataHandler(appEnv: AppEnv) {
	const db = createDb(appEnv.APP_DB)

	return {
		middleware: [],
		async action({ url }) {
			const eventId = readPathEventId(url.pathname, /^\/host\/(\d+)\/data$/)
			if (!eventId) {
				return Response.json({ error: 'Not Found' }, { status: 404 })
			}

			const hostKey = (url.searchParams.get('key') ?? '').trim()
			if (!hostKey) {
				return Response.json({ error: 'Host key required.' }, { status: 401 })
			}

			const eventRecord = await db.findOne(eventsTable, {
				where: { id: eventId },
			})
			if (!eventRecord) {
				return Response.json({ error: 'Event not found.' }, { status: 404 })
			}
			if (eventRecord.host_key !== hostKey) {
				return Response.json({ error: 'Invalid host key.' }, { status: 403 })
			}

			const eventState = await loadEventState(db, eventId)
			if (!eventState) {
				return Response.json({ error: 'Event not found.' }, { status: 404 })
			}

			return Response.json({
				...buildEventResponse(eventState),
				host: {
					sharePath: `/event/${eventId}`,
				},
			})
		},
	} satisfies BuildAction<
		typeof routes.hostData.method,
		typeof routes.hostData.pattern
	>
}

export function createFinalizeEventHandler(appEnv: AppEnv) {
	const db = createDb(appEnv.APP_DB)

	return {
		middleware: [],
		async action({ request, url }) {
			const eventId = readPathEventId(url.pathname, /^\/host\/(\d+)\/finalize$/)
			if (!eventId) {
				return new Response('Not Found', { status: 404 })
			}

			const formData = await request.formData()
			const hostKeyValue = formData.get('key')
			const hostKey = typeof hostKeyValue === 'string' ? hostKeyValue.trim() : ''
			if (!hostKey) {
				return createRedirect(url, `/host/${eventId}`, {
					error: 'Host key required.',
				})
			}

			const slotValue = formData.get('slotId')
			const slotId =
				typeof slotValue === 'string' ? parsePositiveInt(slotValue) : null
			if (!slotId) {
				return createRedirect(url, `/host/${eventId}`, {
					key: hostKey,
					error: 'Select a valid time option.',
				})
			}

			const eventRecord = await db.findOne(eventsTable, {
				where: { id: eventId },
			})
			if (!eventRecord) {
				return createRedirect(url, `/host/${eventId}`, {
					key: hostKey,
					error: 'Event not found.',
				})
			}
			if (eventRecord.host_key !== hostKey) {
				return createRedirect(url, `/host/${eventId}`, {
					error: 'Invalid host key.',
				})
			}

			const slotRecord = await db.findOne(eventSlotsTable, {
				where: { id: slotId, event_id: eventId },
			})
			if (!slotRecord) {
				return createRedirect(url, `/host/${eventId}`, {
					key: hostKey,
					error: 'Selected option does not belong to this event.',
				})
			}

			await db.update(eventsTable, eventId, {
				finalized_slot_id: slotId,
				updated_at: new Date().toISOString(),
			})

			return createRedirect(url, `/host/${eventId}`, {
				key: hostKey,
				finalized: 1,
			})
		},
	} satisfies BuildAction<
		typeof routes.finalizeEvent.method,
		typeof routes.finalizeEvent.pattern
	>
}

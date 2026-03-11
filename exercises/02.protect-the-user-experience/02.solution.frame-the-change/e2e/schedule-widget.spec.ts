import { expect, test } from '@playwright/test'

test('schedule MCP widget loads an existing link and saves availability', async ({
	page,
	request,
}) => {
	const hourMs = 3_600_000
	const rangeStart = new Date(Math.ceil(Date.now() / hourMs) * hourMs + hourMs)
	const rangeEnd = new Date(rangeStart.getTime())
	rangeEnd.setDate(rangeEnd.getDate() + 2)

	const createResponse = await request.post('/api/schedules', {
		data: {
			title: 'MCP widget schedule',
			hostName: 'Host',
			hostTimeZone: 'UTC',
			intervalMinutes: 60,
			rangeStartUtc: rangeStart.toISOString(),
			rangeEndUtc: rangeEnd.toISOString(),
			selectedSlots: [rangeStart.toISOString()],
		},
	})
	expect(createResponse.ok()).toBe(true)
	const createPayload = (await createResponse.json()) as {
		ok?: boolean
		shareToken?: string
	}
	expect(createPayload.ok).toBe(true)
	if (
		typeof createPayload.shareToken !== 'string' ||
		createPayload.shareToken.trim().length === 0
	) {
		throw new Error('Expected /api/schedules to return a non-empty shareToken')
	}
	const shareToken = createPayload.shareToken

	await page.goto(
		`/dev/schedule-ui?shareToken=${encodeURIComponent(shareToken)}&attendeeName=${encodeURIComponent('Alex')}`,
	)

	await expect(
		page.getByRole('heading', { name: 'Your availability' }),
	).toBeVisible()
	await expect(page.getByText('Share token:')).toContainText(shareToken, {
		timeout: 10_000,
	})
	await expect(
		page.getByText(
			'This attendee UI uses the share token provided to open_schedule_ui.',
		),
	).toBeVisible()

	await expect(page.getByLabel('Your name')).toHaveValue('Alex')
	const firstSlotButton = page
		.locator('[data-grid-host] button[data-slot]')
		.first()
	await firstSlotButton.click()
	await expect(page.locator('[data-pending-count]')).toHaveText('1')
	await expect(
		page.getByRole('heading', { name: 'Slot details' }),
	).toBeVisible()

	await page.getByRole('button', { name: 'Save availability' }).click()
	await expect(page.locator('[data-pending-count]')).toHaveText('0')
	await expect(page.getByText('Availability saved.')).toBeVisible()
})

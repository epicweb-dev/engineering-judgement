import { expect, test } from '@playwright/test'

function escapeRegex(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test('attendee update appears in host schedule view', async ({
	browser,
	page,
}) => {
	await page.goto('/')
	await page.getByLabel('Schedule title').fill('Team sync')
	await page.getByLabel('Your name').fill('Host')
	await page.getByRole('button', { name: 'Create share link' }).click()
	await expect(page).toHaveURL(/\/s\/[a-z0-9]+\/[a-z0-9]+$/i)
	const hostDashboardUrl = new URL(page.url())
	const shareToken =
		hostDashboardUrl.pathname.split('/').filter(Boolean)[1] ?? ''
	expect(shareToken).not.toBe('')
	const attendeeUrl = `${hostDashboardUrl.origin}/s/${shareToken}`
	await page.goto(`${attendeeUrl}?name=Host`)
	await expect(page).toHaveURL(new RegExp(`/s/${shareToken}`))
	// Both desktop and mobile tables are rendered; only one is visible.
	const hostChosenSlot = page
		.locator('[data-schedule-grid-shell] table:visible')
		.first()
		.locator('button[aria-pressed="true"]')
		.first()
	await expect(hostChosenSlot).toBeVisible()
	const hostLabel = (await hostChosenSlot.getAttribute('aria-label')) ?? ''
	const slotPrefixMatch = hostLabel.match(
		/^(.*?), (?:selected|not selected) for your availability,/,
	)
	const slotPrefix = slotPrefixMatch?.[1] ?? ''
	expect(slotPrefix.length).toBeGreaterThan(0)

	const attendeeContext = await browser.newContext()
	const attendeePage = await attendeeContext.newPage()

	try {
		await attendeePage.goto(`${attendeeUrl}?name=Alex`)
		await attendeePage.getByLabel('Your name').fill('Alex')

		// Scope to the visible table so this test is viewport-agnostic.
		const candidateSlot = attendeePage
			.locator('[data-schedule-grid-shell] table:visible')
			.first()
			.getByRole('button', {
				name: new RegExp(`^${escapeRegex(slotPrefix)}`),
			})
		await expect(candidateSlot).toBeVisible()
		const candidateSlotValue = await candidateSlot.getAttribute('data-slot')
		expect(candidateSlotValue).not.toBeNull()
		await candidateSlot.click()
		await expect
			.poll(
				async () => {
					const response = await page.request.get(
						`/api/schedules/${shareToken}`,
					)
					if (!response.ok()) return 0
					const payload = (await response.json()) as {
						ok?: boolean
						snapshot?: {
							countsBySlot?: Record<string, number>
						}
					}
					if (!payload.ok || !payload.snapshot || !candidateSlotValue) return 0
					return payload.snapshot.countsBySlot?.[candidateSlotValue] ?? 0
				},
				{ timeout: 16_000 },
			)
			.toBe(2)
		await page.reload()
		const hostUpdatedSlot = page
			.locator('[data-schedule-grid-shell] table:visible')
			.first()
			.getByRole('button', {
				name: new RegExp(`^${escapeRegex(slotPrefix)}`),
			})
		await expect(hostUpdatedSlot).toBeVisible()
		await expect(hostUpdatedSlot).toHaveAttribute('aria-label', /2 attendee/, {
			timeout: 8_000,
		})
	} finally {
		await attendeeContext.close()
	}
})

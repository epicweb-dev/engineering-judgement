import { expect, test } from '@playwright/test'

test('host creates schedule and attendee submits response', async ({ page }) => {
	await page.goto('/')

	await page.getByLabel('Plan title').fill('Friday dinner')
	await page.getByRole('button', { name: '08:00' }).first().click()
	await expect(page.getByText('5 days selected, 1 slot active')).toBeVisible()

	const createRequestPromise = page.waitForRequest(
		(request) =>
			request.url().includes('/api/schedules') && request.method() === 'POST',
	)
	await page.getByRole('button', { name: 'Create schedule' }).click()
	const createRequest = await createRequestPromise
	const createPayload = JSON.parse(createRequest.postData() ?? '{}') as {
		hostSlots?: Array<string>
	}
	expect(createPayload.hostSlots?.length ?? 0).toBeGreaterThan(0)

	await expect(page).toHaveURL(/\/s\/[^/]+\/[^/]+$/)
	await expect(page.getByText('Share + response review')).toBeVisible()

	const respondentLinkElement = page.getByText('Respondent link:').locator('a')
	const respondentHref = await respondentLinkElement.getAttribute('href')
	expect(respondentHref).toMatch(/^\/s\/[^/]+$/)
	if (!respondentHref) {
		throw new Error('Expected respondent link href to exist')
	}

	const editUrl = page.url()
	await page.goto(respondentHref)

	await page.getByLabel('Your name').fill('Alex')
	await page.locator('button[data-slot-id]:not([disabled])').first().click()
	await page.getByRole('button', { name: 'Submit availability' }).click()

	await expect(page.getByText('Availability submitted.')).toBeVisible()

	await page.goto(editUrl)
	await expect(page.getByText('Responses: 1')).toBeVisible()
})


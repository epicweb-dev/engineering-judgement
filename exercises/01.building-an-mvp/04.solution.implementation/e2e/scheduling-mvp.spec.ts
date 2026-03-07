import { expect, test } from '@playwright/test'

test('creates a no-account schedule and finalizes it from host link', async ({
	page,
	context,
}) => {
	await page.goto('/')

	await page.getByLabel('Event title').fill('Team dinner')
	await page
		.getByLabel('Time options (one per line)')
		.fill('Thu 7:00 PM\nFri 6:30 PM\nSat 1:00 PM')
	await page.getByRole('button', { name: 'Create schedule' }).click()

	await expect(page).toHaveURL(/\/host\/\d+\?key=.*created=1/)
	await expect(
		page.getByText('Schedule created. Save this private host link.'),
	).toBeVisible()

	const shareLink = await page
		.getByLabel('Share this participant link')
		.inputValue()

	const participantPage = await context.newPage()
	await participantPage.goto(shareLink)
	await expect(participantPage).toHaveURL(/\/event\/\d+$/)
	await expect(
		participantPage.getByText('Pick every time you can make. No account needed.'),
	).toBeVisible()

	await participantPage.getByLabel('Your name').fill('Una')
	await participantPage.getByLabel('Thu 7:00 PM').check()
	await participantPage.getByLabel('Sat 1:00 PM').check()
	await participantPage
		.getByRole('button', { name: 'Submit availability' })
		.click()

	await expect(
		participantPage.getByText('Saved availability for Una.'),
	).toBeVisible()

	await page.reload()
	const slotCard = page.getByRole('listitem').filter({ hasText: 'Thu 7:00 PM' })
	await expect(slotCard.getByText('1 available')).toBeVisible()
	await expect(slotCard.getByText('Una')).toBeVisible()
	await slotCard.getByRole('button', { name: 'Finalize this time' }).click()

	await expect(page).toHaveURL(/\/host\/\d+\?key=.*finalized=1/)
	await expect(page.getByText('Finalized schedule updated.')).toBeVisible()
	await expect(page.getByText('Finalized time: Thu 7:00 PM')).toBeVisible()
})

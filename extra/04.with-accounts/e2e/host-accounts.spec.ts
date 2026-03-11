import { expect, test } from '@playwright/test'

function parseHostRouteTokens(url: string) {
	const scheduleUrl = new URL(url)
	const segments = scheduleUrl.pathname.split('/').filter(Boolean)
	return {
		shareToken: segments[1] ?? '',
		hostAccessToken: segments[2] ?? '',
	}
}

test('host can claim a schedule and reopen it from account schedules', async ({
	page,
}) => {
	const scheduleTitle = `Planning session ${Date.now()}`
	await page.goto('/')
	await page.getByLabel('Schedule title').fill(scheduleTitle)
	await page.getByLabel('Your name').fill('Host Original')
	await page.getByRole('button', { name: 'Create share link' }).click()
	await expect(page).toHaveURL(/\/s\/[a-z0-9]+\/[a-z0-9]+$/i)

	const { shareToken, hostAccessToken } = parseHostRouteTokens(page.url())
	expect(shareToken).not.toBe('')
	expect(hostAccessToken).not.toBe('')
	if (!shareToken || !hostAccessToken) {
		throw new Error('Expected private host route tokens after schedule creation.')
	}

	await expect(
		page.getByRole('link', { name: 'Sign in to save this schedule' }),
	).toBeVisible()
	await page.getByRole('link', { name: 'Sign in to save this schedule' }).click()
	await expect(page).toHaveURL(/\/login/)

	await page.getByLabel('Email address').fill('host@example.com')
	await page.getByRole('button', { name: 'Create sign-in link' }).click()
	const openLink = page.getByRole('link', { name: 'Open sign-in link' })
	await expect(openLink).toBeVisible()
	await openLink.click()

	await expect(page).toHaveURL(
		new RegExp(`/s/${shareToken}/${hostAccessToken}$`, 'i'),
	)
	await expect(
		page.getByRole('button', { name: 'Save this schedule to your account' }),
	).toBeVisible()
	await page
		.getByRole('button', { name: 'Save this schedule to your account' })
		.click()
	await expect(
		page.getByText('Saved to your account. You can reopen it from Your schedules.'),
	).toBeVisible()

	await page
		.locator('#main-content')
		.getByRole('link', { name: 'Your schedules' })
		.click()
	await expect(page).toHaveURL('/account/schedules')
	await expect(page.getByRole('heading', { name: 'Your schedules' })).toBeVisible()
	await expect(page.getByText(scheduleTitle)).toBeVisible()

	await page
		.getByRole('article')
		.filter({ hasText: scheduleTitle })
		.getByRole('link', { name: 'Open dashboard' })
		.click()
	await expect(page).toHaveURL(`/account/schedules/${shareToken}`)
	await expect(
		page.getByText(/You are managing this schedule from your account/),
	).toBeVisible()

	await page.getByLabel('Edit host name for Host Original').click()
	const hostNameInput = page.getByLabel(
		'Submission name input for Host Original',
	)
	await expect(hostNameInput).toBeVisible()
	await hostNameInput.fill('Host Account')
	await hostNameInput.press('Enter')
	await expect(page.getByText('Host settings synced.')).toBeVisible()
	await expect(
		page.getByLabel('Edit host name for Host Account'),
	).toBeVisible()

	await page.reload()
	await expect(page).toHaveURL(`/account/schedules/${shareToken}`)
	await expect(
		page.getByLabel('Edit host name for Host Account'),
	).toBeVisible()
})

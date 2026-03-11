import { expect, test } from '@playwright/test'

test('home page renders the schedule builder', async ({ page }) => {
	await page.goto('/')
	await expect(page).toHaveTitle('epic-scheduler')
	await expect(
		page.getByRole('heading', { name: 'Create a schedule' }),
	).toBeVisible()
	await expect(page.getByLabel('Plan title')).toHaveValue('Friday Hangout')
	await expect(
		page.getByRole('button', { name: 'Create schedule' }),
	).toBeVisible()
})

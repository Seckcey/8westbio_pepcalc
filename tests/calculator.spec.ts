import { expect, test } from '@playwright/test'

test('calculates defaults and handles syringe capacity warnings', async ({ page }) => {
  await page.goto('/')

  const resultsPanel = page.locator('.results-panel')

  await expect(resultsPanel.locator('output').filter({ hasText: '5.00 mg/mL' }).first()).toBeVisible()
  await expect(resultsPanel.locator('output').filter({ hasText: '0.10 mL' }).first()).toBeVisible()
  await expect(resultsPanel.locator('output').filter({ hasText: '10 units' }).first()).toBeVisible()
  await expect(resultsPanel.locator('output').filter({ hasText: '20 draws' }).first()).toBeVisible()

  await page.getByLabel('Desired amount per draw').fill('8000')

  await expect(page.getByText('Draw volume exceeds selected syringe capacity.')).toBeVisible()
  await expect(page.getByText('Use 3 mL')).toBeVisible()

  await page.getByRole('button', { name: 'Use 3 mL' }).click()

  await expect(page.getByText('Draw volume exceeds selected syringe capacity.')).toHaveCount(0)
  await expect(resultsPanel.locator('output').filter({ hasText: '1.60 mL' }).first()).toBeVisible()
})

test('switches between light, dark, and system theme modes', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Light' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.getByRole('button', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.getByRole('button', { name: 'System' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'system')
})

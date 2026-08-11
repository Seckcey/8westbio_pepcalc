import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const repositoryRoot = process.cwd()
const analyticsSource = readFileSync(resolve(repositoryRoot, 'src/analytics.ts'), 'utf8')
const preferencesSource = readFileSync(
  resolve(repositoryRoot, 'src/AnalyticsPreferences.tsx'),
  'utf8',
)
const retiredProvider = ['uma', 'mi'].join('')
const retiredHost = ['analytics', '8westventures', 'com'].join('.')
const retiredWebsiteId = ['f67652d6', '9b7b', '46c5', 'a807', 'dd971150369e'].join('-')

function readFilesRecursively(path: string): string[] {
  if (!existsSync(path)) return []
  if (statSync(path).isFile()) return [readFileSync(path, 'utf8')]

  return readdirSync(path).flatMap((entry) => readFilesRecursively(resolve(path, entry)))
}

test('uses the existing 8 West Bio GA4 stream behind explicit consent', () => {
  expect(analyticsSource).toContain("const measurementId = 'G-2L4W1CJC8D'")
  expect(analyticsSource).toContain("const productionHost = 'calc.8westbio.com'")
  expect(analyticsSource).toContain("cookie_domain: '8westbio.com'")
  expect(analyticsSource).toContain('send_page_view: false')
  expect(analyticsSource).toContain('allow_google_signals: false')
  expect(analyticsSource).toContain('allow_ad_personalization_signals: false')
  expect(analyticsSource).toContain('page_location: sanitizedPageLocation()')
  expect(analyticsSource).toContain('page_referrer: sanitizedPageReferrer()')

  const consentDefault = analyticsSource.indexOf("gtag('consent', 'default'")
  const consentUpdate = analyticsSource.indexOf("gtag('consent', 'update'")
  const trackerLoad = analyticsSource.indexOf('document.head.appendChild(script)')
  const configuration = analyticsSource.indexOf("gtag('config', measurementId")

  expect(consentDefault).toBeGreaterThan(-1)
  expect(consentUpdate).toBeGreaterThan(consentDefault)
  expect(configuration).toBeGreaterThan(consentUpdate)
  expect(trackerLoad).toBeGreaterThan(configuration)
})

test('contains only the approved coarse calculator events', () => {
  for (const eventName of [
    'calculator_used',
    'preset_applied',
    'preset_saved',
    'results_copied',
    'theme_changed',
  ]) {
    expect(analyticsSource).toContain(eventName)
  }

  for (const forbiddenToken of [
    'peptideMg',
    'waterMl',
    'desiredDose',
    'syringeId',
    'concentrationMgPerMl',
    'drawVolumeMl',
    'syringeUnits',
    'dosesPerVial',
    'remainingMg',
    'preset.id',
    'FormData',
  ]) {
    expect(analyticsSource).not.toContain(forbiddenToken)
  }
})

test('removes the retired tracker from source and generated assets', () => {
  const deployableText = [
    ...readFilesRecursively(resolve(repositoryRoot, 'src')),
    ...readFilesRecursively(resolve(repositoryRoot, 'public')),
    ...readFilesRecursively(resolve(repositoryRoot, 'index.html')),
    ...readFilesRecursively(resolve(repositoryRoot, 'dist')),
  ].join('\n')

  for (const retiredMarker of [
    retiredProvider,
    retiredHost,
    retiredWebsiteId,
    ['data', 'website', 'id'].join('-'),
    ['/api', 'send'].join('/'),
  ]) {
    expect(deployableText.toLowerCase()).not.toContain(retiredMarker.toLowerCase())
  }
})

test('offers an explicit choice and an always-available preferences control', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()

  const dialog = page.getByRole('dialog', { name: 'Optional analytics' })
  await expect(dialog).toBeVisible()
  await expect(page.locator('script[data-analytics-provider="ga4"]')).toHaveCount(0)

  await page.getByRole('button', { name: 'Decline' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Analytics preferences' })).toBeVisible()

  await page.getByRole('button', { name: 'Analytics preferences' }).click()
  await page.getByRole('button', { name: 'Allow analytics' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('script[data-analytics-provider="ga4"]')).toHaveCount(0)

  expect(preferencesSource).toContain('We never send dosage inputs')
  expect(preferencesSource).toContain('https://8westbio.com/policies/privacy-policy')
})

test('sanitizes production GA4 configuration and custom events at runtime', async ({ page }) => {
  const distRoot = resolve(repositoryRoot, 'dist')
  expect(existsSync(resolve(distRoot, 'index.html'))).toBe(true)

  const googleRequests: string[] = []
  await page.route('https://www.googletagmanager.com/**', async (route) => {
    googleRequests.push(route.request().url())
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  })
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort())
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort())
  await page.route('https://calc.8westbio.com/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname
    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1)
    const filePath = resolve(distRoot, relativePath)
    if (!filePath.startsWith(distRoot) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      await route.fulfill({ status: 404, body: 'Not found' })
      return
    }

    const contentType = filePath.endsWith('.js')
      ? 'application/javascript'
      : filePath.endsWith('.css')
        ? 'text/css'
        : filePath.endsWith('.svg')
          ? 'image/svg+xml'
          : filePath.endsWith('.png')
            ? 'image/png'
            : 'text/html'
    await route.fulfill({ status: 200, contentType, body: readFileSync(filePath) })
  })

  await page.goto('https://calc.8westbio.com/?dosage=private#result')
  await expect(page.locator('script[data-analytics-provider="ga4"]')).toHaveCount(0)
  expect(googleRequests).toHaveLength(0)

  await page.getByRole('button', { name: 'Allow analytics' }).click()
  await expect(page.locator('script[data-analytics-provider="ga4"]')).toHaveCount(1)
  expect(googleRequests).toHaveLength(1)

  await page.getByLabel('Desired amount per draw').fill('8000')
  await expect.poll(async () => {
    return page.evaluate(() => {
      const commands = (window as typeof window & { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? []
      return commands.some((command) => command[0] === 'event' && command[1] === 'calculator_used')
    })
  }).toBe(true)

  const queuedCommands = await page.evaluate(
    () => (window as typeof window & { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? [],
  )
  const queuedCommandShapes = await page.evaluate(() => {
    const commands = (window as typeof window & { dataLayer?: unknown[] }).dataLayer ?? []
    return commands
      .filter((command) => typeof (command as { 0?: unknown })[0] === 'string')
      .map((command) => Object.prototype.toString.call(command))
  })
  const config = queuedCommands.find(
    (command) => command[0] === 'config' && command[1] === 'G-2L4W1CJC8D',
  )
  const calculatorEvent = queuedCommands.find(
    (command) => command[0] === 'event' && command[1] === 'calculator_used',
  )

  expect(config?.[2]).toMatchObject({
    page_location: 'https://calc.8westbio.com/',
    page_referrer: '',
    send_page_view: false,
  })
  expect(calculatorEvent?.[2]).toMatchObject({
    calculator_type: 'peptide_reconstitution',
  })
  expect(queuedCommandShapes).toEqual(Array(7).fill('[object Arguments]'))
  expect(JSON.stringify(queuedCommands)).not.toContain('private')
  expect(JSON.stringify(queuedCommands)).not.toContain('#result')
  expect(JSON.stringify(queuedCommands)).not.toContain('8000')
})

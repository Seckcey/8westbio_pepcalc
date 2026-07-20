import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const analyticsSource = readFileSync(resolve(process.cwd(), 'src/analytics.ts'), 'utf8')

test('uses the approved Umami property and production-only domain gate', () => {
  expect(analyticsSource).toContain('f67652d6-9b7b-46c5-a807-dd971150369e')
  expect(analyticsSource).toContain('https://analytics.8westventures.com/script.js')
  expect(analyticsSource).toContain("const productionHost = 'calc.8westbio.com'")
  expect(analyticsSource).toContain("script.dataset.excludeSearch = 'true'")
  expect(analyticsSource).toContain("script.dataset.excludeHash = 'true'")
})

test('contains only approved coarse calculator events', () => {
  for (const eventName of [
    'calculator_used',
    'preset_applied',
    'preset_saved',
    'results_copied',
    'theme_changed',
  ]) {
    expect(analyticsSource).toContain(eventName)
  }

  expect(analyticsSource).not.toContain('umami.identify')
  expect(analyticsSource).not.toContain('FormData')
  expect(analyticsSource).not.toContain('localStorage.getItem')
  expect(analyticsSource).not.toContain('localStorage.setItem')
})

test('does not reference calculator numeric state or result values', () => {
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
  ]) {
    expect(analyticsSource).not.toContain(forbiddenToken)
  }
})

type GtagCommand = [command: string, ...args: unknown[]]

declare global {
  interface Window {
    dataLayer?: IArguments[]
    gtag?: (...args: GtagCommand) => void
  }
}

export type AnalyticsConsentChoice = 'unknown' | 'granted' | 'denied'

const measurementId = 'G-2L4W1CJC8D'
const productionHost = 'calc.8westbio.com'
const consentStorageKey = '8westbio-calculator-analytics-consent-v1'
const trackerSelector = 'script[data-analytics-provider="ga4"]'
let analyticsConsent: AnalyticsConsentChoice | null = null
let analyticsActivated = false
let pageViewSent = false
let uiTrackingAttached = false

function readStoredConsent(): AnalyticsConsentChoice {
  try {
    const storedConsent = window.localStorage.getItem(consentStorageKey)
    return storedConsent === 'granted' || storedConsent === 'denied'
      ? storedConsent
      : 'unknown'
  } catch {
    return 'unknown'
  }
}

export function getAnalyticsConsent(): AnalyticsConsentChoice {
  if (typeof window === 'undefined') return 'unknown'
  analyticsConsent ??= readStoredConsent()
  return analyticsConsent
}

function writeStoredConsent(choice: Exclude<AnalyticsConsentChoice, 'unknown'>) {
  try {
    window.localStorage.setItem(consentStorageKey, choice)
  } catch {
    // A blocked storage API must not affect calculator behavior.
  }
  analyticsConsent = choice
}

function ensureGtag() {
  window.dataLayer ??= []
  window.gtag ??= function gtag() {
    window.dataLayer?.push(arguments)
  }
  return window.gtag
}

function deniedConsentState() {
  return {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  }
}

function sanitizedPageLocation() {
  if (window.location.protocol !== 'https:' || window.location.hostname !== productionHost) {
    return `https://${productionHost}/`
  }

  return `${window.location.origin}${window.location.pathname || '/'}`
}

function sanitizedPageReferrer() {
  if (!document.referrer) return ''

  try {
    const referrer = new URL(document.referrer)
    if (referrer.protocol !== 'https:' && referrer.protocol !== 'http:') return ''

    const isBioHost =
      referrer.hostname === '8westbio.com' || referrer.hostname.endsWith('.8westbio.com')
    return `${referrer.origin}${isBioHost ? referrer.pathname || '/' : '/'}`
  } catch {
    return ''
  }
}

function sendPageView() {
  if (pageViewSent || getAnalyticsConsent() !== 'granted' || !window.gtag) return
  pageViewSent = true

  window.gtag('event', 'page_view', {
    send_to: measurementId,
    page_location: sanitizedPageLocation(),
    page_path: window.location.pathname || '/',
    page_title: '8 West Bio Peptide Dosing Calculator',
  })
}

function loadTracker() {
  if (window.location.hostname !== productionHost || getAnalyticsConsent() !== 'granted') return
  if (analyticsActivated || document.querySelector(trackerSelector)) return

  analyticsActivated = true
  const gtag = ensureGtag()

  gtag('consent', 'default', deniedConsentState())
  gtag('set', 'ads_data_redaction', true)
  gtag('consent', 'update', {
    ...deniedConsentState(),
    analytics_storage: 'granted',
  })
  gtag('js', new Date())
  gtag('config', measurementId, {
    send_page_view: false,
    cookie_domain: '8westbio.com',
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: sanitizedPageLocation(),
    page_referrer: sanitizedPageReferrer(),
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  script.dataset.analyticsProvider = 'ga4'
  document.head.appendChild(script)

  sendPageView()
}

export function setAnalyticsConsent(choice: Exclude<AnalyticsConsentChoice, 'unknown'>) {
  const previousChoice = getAnalyticsConsent()
  writeStoredConsent(choice)

  if (choice === 'granted') {
    loadTracker()
    return
  }

  if (window.gtag) {
    window.gtag('consent', 'update', deniedConsentState())
  }

  if (previousChoice === 'granted' || analyticsActivated || document.querySelector(trackerSelector)) {
    window.setTimeout(() => window.location.reload(), 0)
  }
}

function trackEvent(name: string, data: Record<string, string> = {}) {
  if (
    window.location.hostname !== productionHost ||
    getAnalyticsConsent() !== 'granted' ||
    !window.gtag
  ) {
    return
  }

  try {
    window.gtag('event', name, {
      send_to: measurementId,
      environment: 'production',
      ...data,
    })
  } catch {
    // Analytics must never affect calculator behavior.
  }
}

function themeModeFromButton(button: HTMLButtonElement) {
  const title = button.getAttribute('title') || ''
  if (title === 'Light theme') return 'light'
  if (title === 'Dark theme') return 'dark'
  if (title === 'System theme') return 'system'
  return null
}

function attachUiTracking() {
  if (uiTrackingAttached) return true

  const calculatorForm = document.querySelector<HTMLFormElement>('.calculator-panel')
  const presetList = document.querySelector<HTMLElement>('.preset-list')
  const copyButton = document.querySelector<HTMLButtonElement>('.copy-button')

  if (!calculatorForm || !presetList) return false
  uiTrackingAttached = true

  let calculatorUsed = false
  let savePending = false
  let copyReported = false

  const reportCalculatorUse = () => {
    window.setTimeout(() => {
      if (calculatorUsed || !document.querySelector('.result-stack')) return
      calculatorUsed = true
      trackEvent('calculator_used', { calculator_type: 'peptide_reconstitution' })
    }, 0)
  }

  calculatorForm.addEventListener('input', reportCalculatorUse)
  calculatorForm.addEventListener('change', reportCalculatorUse)
  calculatorForm.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest('.chip, .segmented button, .alternative-list button')) {
      reportCalculatorUse()
    }
  })

  document.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return

    const themeButton = target.closest<HTMLButtonElement>('.theme-toggle button')
    if (themeButton) {
      const themeMode = themeModeFromButton(themeButton)
      if (themeMode) trackEvent('theme_changed', { theme_mode: themeMode })
      return
    }

    if (target.closest('.preset-card')) {
      trackEvent('preset_applied')
      return
    }

    if (target.closest('.saved-presets .ghost-button')) {
      savePending = true
    }
  })

  const presetObserver = new MutationObserver(() => {
    if (!savePending) return
    savePending = false
    trackEvent('preset_saved')
  })
  presetObserver.observe(presetList, { childList: true, subtree: true })

  if (copyButton) {
    const copyObserver = new MutationObserver(() => {
      const copied = copyButton.textContent?.trim() === 'Copied'
      if (copied && !copyReported) {
        copyReported = true
        trackEvent('results_copied')
      } else if (!copied) {
        copyReported = false
      }
    })
    copyObserver.observe(copyButton, { childList: true, subtree: true, characterData: true })
  }

  return true
}

function waitForUi() {
  if (attachUiTracking()) return

  const observer = new MutationObserver(() => {
    if (!attachUiTracking()) return
    observer.disconnect()
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

export function initializeAnalytics() {
  if (window.location.hostname !== productionHost) return
  if (getAnalyticsConsent() === 'granted') loadTracker()
  waitForUi()
}

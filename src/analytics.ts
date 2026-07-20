type UmamiClient = {
  track: (name: string, data?: Record<string, string>) => void
}

declare global {
  interface Window {
    umami?: UmamiClient
  }
}

const analyticsScript = 'https://analytics.8westventures.com/script.js'
const websiteId = 'f67652d6-9b7b-46c5-a807-dd971150369e'
const productionHost = 'calc.8westbio.com'
const pendingEvents: Array<{ name: string; data: Record<string, string> }> = []

function flushEvents() {
  if (!window.umami || typeof window.umami.track !== 'function') return

  while (pendingEvents.length > 0) {
    const event = pendingEvents.shift()
    if (!event) continue

    try {
      window.umami.track(event.name, event.data)
    } catch {
      pendingEvents.length = 0
    }
  }
}

function trackEvent(name: string, data: Record<string, string> = {}) {
  const eventData = { environment: 'production', ...data }

  if (window.umami && typeof window.umami.track === 'function') {
    try {
      window.umami.track(name, eventData)
    } catch {
      // Analytics must never affect calculator behavior.
    }
    return
  }

  if (pendingEvents.length < 20) {
    pendingEvents.push({ name, data: eventData })
  }
}

function loadTracker() {
  if (window.location.hostname !== productionHost) return
  if (document.querySelector(`script[data-website-id="${websiteId}"]`)) return

  const script = document.createElement('script')
  script.async = true
  script.src = analyticsScript
  script.dataset.websiteId = websiteId
  script.dataset.domains = productionHost
  script.dataset.excludeSearch = 'true'
  script.dataset.excludeHash = 'true'
  script.addEventListener('load', flushEvents, { once: true })
  document.head.appendChild(script)
}

function themeModeFromButton(button: HTMLButtonElement) {
  const title = button.getAttribute('title') || ''
  if (title === 'Light theme') return 'light'
  if (title === 'Dark theme') return 'dark'
  if (title === 'System theme') return 'system'
  return null
}

function attachUiTracking() {
  const calculatorForm = document.querySelector<HTMLFormElement>('.calculator-panel')
  const presetList = document.querySelector<HTMLElement>('.preset-list')
  const copyButton = document.querySelector<HTMLButtonElement>('.copy-button')

  if (!calculatorForm || !presetList) return false

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
  loadTracker()
  waitForUi()
}

import { useEffect, useRef, useState } from 'react'
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  type AnalyticsConsentChoice,
} from './analytics'

export function AnalyticsPreferences() {
  const [choice, setChoice] = useState<AnalyticsConsentChoice>(getAnalyticsConsent)
  const [isOpen, setIsOpen] = useState(choice === 'unknown')
  const dialogRef = useRef<HTMLElement>(null)
  const preferencesButtonRef = useRef<HTMLButtonElement>(null)
  const openedFromPreferences = useRef(false)

  useEffect(() => {
    if (isOpen) dialogRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || choice === 'unknown') return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePreferences()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [choice, isOpen])

  const restoreFocus = () => {
    const focusTarget = openedFromPreferences.current
      ? preferencesButtonRef.current
      : document.querySelector<HTMLInputElement>('#peptide-mg')
    openedFromPreferences.current = false
    window.requestAnimationFrame(() => focusTarget?.focus())
  }

  const closePreferences = () => {
    setIsOpen(false)
    restoreFocus()
  }

  const openPreferences = () => {
    openedFromPreferences.current = true
    setIsOpen(true)
  }

  const choose = (nextChoice: Exclude<AnalyticsConsentChoice, 'unknown'>) => {
    setChoice(nextChoice)
    setAnalyticsConsent(nextChoice)
    closePreferences()
  }

  return (
    <>
      <div className="privacy-links">
        <a href="https://8westbio.com/policies/privacy-policy">Privacy policy</a>
        <button ref={preferencesButtonRef} type="button" onClick={openPreferences}>
          Analytics preferences
        </button>
      </div>

      {isOpen ? (
        <aside
          ref={dialogRef}
          className="analytics-consent"
          role="dialog"
          aria-modal="false"
          aria-labelledby="analytics-consent-title"
          aria-describedby="analytics-consent-description"
          tabIndex={-1}
        >
          <strong id="analytics-consent-title">Optional analytics</strong>
          <p id="analytics-consent-description">
            Analytics help 8 West Bio improve this calculator. We never send dosage inputs,
            calculated results, or saved preset contents.
          </p>
          <div className="analytics-consent-actions">
            {choice !== 'unknown' ? (
              <button type="button" className="consent-cancel" onClick={closePreferences}>
                Cancel
              </button>
            ) : null}
            <button type="button" className="consent-decline" onClick={() => choose('denied')}>
              Decline
            </button>
            <button
              type="button"
              className="consent-allow"
              onClick={() => choose('granted')}
            >
              Allow analytics
            </button>
          </div>
        </aside>
      ) : null}
    </>
  )
}

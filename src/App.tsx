import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  calculateDose,
  dosePresetMcg,
  getSyringeById,
  parsePositiveNumber,
  syringeOptions,
  vialPresetMg,
  type DoseUnit,
} from './calculator'
import './App.css'

type SavedPreset = {
  id: string
  peptideMg: number
  waterMl: number
  desiredDoseMcg: number
  syringeId: string
  createdAt: string
}

const presetStorageKey = '8westbio-peptide-calculator-presets'

const defaultSavedPresets: SavedPreset[] = [
  {
    id: 'default-10mg-2ml-500mcg',
    peptideMg: 10,
    waterMl: 2,
    desiredDoseMcg: 500,
    syringeId: 'u100-1ml',
    createdAt: 'Starter preset',
  },
]

function loadSavedPresets() {
  if (typeof window === 'undefined') {
    return defaultSavedPresets
  }

  try {
    const storedPresets = window.localStorage.getItem(presetStorageKey)
    if (!storedPresets) {
      return defaultSavedPresets
    }

    const parsed = JSON.parse(storedPresets) as SavedPreset[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultSavedPresets
  } catch {
    return defaultSavedPresets
  }
}

function formatNumber(value: number, decimals = 2) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatCompactNumber(value: number, decimals = 2) {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: decimals,
  })
}

function buildResultSummary(
  peptideMg: string,
  waterMl: string,
  selectedSyringeLabel: string,
  calculation: NonNullable<ReturnType<typeof calculateDose>>,
) {
  const syringeLine =
    calculation.syringeUnits === null
      ? `Syringe mark: ${formatNumber(calculation.roundedDrawVolumeMl, 2)} mL`
      : `Syringe units: ${formatCompactNumber(calculation.syringeUnits, 0)} units`

  return [
    '8 West Bio Peptide Calculator Result',
    'Research use only. Not for human or veterinary use.',
    `Vial: ${peptideMg} mg`,
    `Bacteriostatic water: ${waterMl} mL`,
    `Desired amount: ${formatCompactNumber(calculation.desiredDoseMcg, 0)} mcg (${formatNumber(
      calculation.desiredDoseMg,
      3,
    )} mg)`,
    `Syringe: ${selectedSyringeLabel}`,
    `Concentration: ${formatNumber(calculation.concentrationMgPerMl, 2)} mg/mL`,
    `Draw volume: ${formatNumber(calculation.roundedDrawVolumeMl, 2)} mL`,
    syringeLine,
    `Approximate full draws per vial: ${calculation.dosesPerVial}`,
    `Remaining after full draws: ${formatNumber(calculation.remainingMg, 3)} mg`,
  ].join('\n')
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    vial: (
      <>
        <path d="M10 2h4" />
        <path d="M11 2v5l-5 9.5A3 3 0 0 0 8.7 21h6.6a3 3 0 0 0 2.7-4.5L13 7V2" />
        <path d="M8.8 15h6.4" />
      </>
    ),
    drop: (
      <path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z" />
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </>
    ),
    syringe: (
      <>
        <path d="m18 2 4 4" />
        <path d="m17 7 2-2" />
        <path d="m4 20 5-5" />
        <path d="m9 15-2-2 8-8 4 4-8 8-2-2Z" />
        <path d="m12 8 4 4" />
        <path d="m10 10 2 2" />
      </>
    ),
    copy: (
      <>
        <rect x="9" y="9" width="10" height="10" rx="2" />
        <path d="M5 15V7a2 2 0 0 1 2-2h8" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9v5" />
        <path d="M12 17h.01" />
      </>
    ),
    formula: (
      <>
        <path d="M4 6h16" />
        <path d="M6 12h12" />
        <path d="M8 18h8" />
      </>
    ),
    save: (
      <>
        <path d="M5 4h11l3 3v13H5Z" />
        <path d="M8 4v6h7V4" />
        <path d="M8 20v-6h8v6" />
      </>
    ),
  }

  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name] ?? paths.formula}
    </svg>
  )
}

function ResultRow({
  icon,
  label,
  help,
  value,
  detail,
}: {
  icon: string
  label: string
  help: string
  value: string
  detail?: string
}) {
  return (
    <div className="result-row">
      <span className="icon-shell">
        <Icon name={icon} />
      </span>
      <div>
        <strong>{label}</strong>
        <span>{help}</span>
      </div>
      <output>
        {value}
        {detail ? <small>{detail}</small> : null}
      </output>
    </div>
  )
}

function App() {
  const [peptideMgInput, setPeptideMgInput] = useState('10')
  const [waterMlInput, setWaterMlInput] = useState('2')
  const [desiredDoseInput, setDesiredDoseInput] = useState('500')
  const [doseUnit, setDoseUnit] = useState<DoseUnit>('mcg')
  const [syringeId, setSyringeId] = useState('u100-1ml')
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(loadSavedPresets)
  const [copyStatus, setCopyStatus] = useState('Copy results')

  const peptideMg = parsePositiveNumber(peptideMgInput)
  const waterMl = parsePositiveNumber(waterMlInput)
  const desiredDose = parsePositiveNumber(desiredDoseInput)
  const selectedSyringe = getSyringeById(syringeId)

  const calculation = useMemo(() => {
    if (peptideMg === null || waterMl === null || desiredDose === null) {
      return null
    }

    return calculateDose({
      peptideMg,
      waterMl,
      desiredDose,
      doseUnit,
      syringeId,
    })
  }, [peptideMg, waterMl, desiredDose, doseUnit, syringeId])

  const alternativeSyringes = useMemo(() => {
    if (!calculation || !calculation.exceedsCapacity) {
      return []
    }

    return syringeOptions
      .filter((syringe) => syringe.id !== syringeId && syringe.capacityMl >= calculation.drawVolumeMl)
      .slice(0, 3)
  }, [calculation, syringeId])

  const inputIssue =
    peptideMg === null || waterMl === null || desiredDose === null
      ? 'Enter positive numbers for vial amount, water, and desired amount.'
      : calculation === null
        ? 'The requested setup cannot be calculated. Check the desired amount and vial size.'
        : ''

  useEffect(() => {
    window.localStorage.setItem(presetStorageKey, JSON.stringify(savedPresets))
  }, [savedPresets])

  function applySavedPreset(preset: SavedPreset) {
    setPeptideMgInput(String(preset.peptideMg))
    setWaterMlInput(String(preset.waterMl))
    setDesiredDoseInput(String(preset.desiredDoseMcg))
    setDoseUnit('mcg')
    setSyringeId(preset.syringeId)
  }

  function saveCurrentPreset() {
    if (!calculation || peptideMg === null || waterMl === null) {
      return
    }

    const createdPreset: SavedPreset = {
      id: `preset-${Date.now()}`,
      peptideMg,
      waterMl,
      desiredDoseMcg: Math.round(calculation.desiredDoseMcg),
      syringeId,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    }

    setSavedPresets((currentPresets) => [
      createdPreset,
      ...currentPresets.filter((preset) => preset.id !== 'default-10mg-2ml-500mcg'),
    ].slice(0, 4))
  }

  async function copyResults() {
    if (!calculation) {
      return
    }

    const summary = buildResultSummary(
      peptideMgInput,
      waterMlInput,
      selectedSyringe.label,
      calculation,
    )

    try {
      await navigator.clipboard.writeText(summary)
      setCopyStatus('Copied')
      window.setTimeout(() => setCopyStatus('Copy results'), 1800)
    } catch {
      setCopyStatus('Copy unavailable')
      window.setTimeout(() => setCopyStatus('Copy results'), 1800)
    }
  }

  const drawVolumeLabel = calculation
    ? `${formatNumber(calculation.roundedDrawVolumeMl, 2)} mL`
    : '--'
  const syringeUnitLabel =
    calculation?.syringeUnits === null
      ? `${drawVolumeLabel} mark`
      : calculation
        ? `${formatCompactNumber(calculation.syringeUnits, 0)} units`
        : '--'

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand-lockup" href="https://8westbio.com" aria-label="8 West Bio home">
          <img src="/8westbio-logo.png" alt="8 West Bio" />
        </a>
        <nav aria-label="Primary navigation">
          <a href="#calculator" aria-current="page">Calculator</a>
          <a href="#formula">Formula</a>
          <a href="#faq">FAQ</a>
          <a href="https://8westbio.com">8westbio.com</a>
        </nav>
      </header>

      <main>
        <section className="calculator-grid" id="calculator" aria-labelledby="calculator-title">
          <form className="panel calculator-panel">
            <div className="panel-heading">
              <div>
                <h1 id="calculator-title">Peptide Dosing Calculator</h1>
                <p>
                  Convert vial size, reconstitution volume, and desired research amount into
                  concentration, draw volume, and syringe markings.
                </p>
              </div>
            </div>

            <div className="field-row">
              <span className="icon-shell">
                <Icon name="vial" />
              </span>
              <label htmlFor="peptide-mg">
                <strong>Peptide amount in vial</strong>
                <span>Total lyophilized peptide before reconstitution.</span>
              </label>
              <div className="input-with-unit">
                <input
                  id="peptide-mg"
                  inputMode="decimal"
                  min="0"
                  type="number"
                  value={peptideMgInput}
                  onChange={(event) => setPeptideMgInput(event.target.value)}
                />
                <span>mg</span>
              </div>
            </div>

            <div className="chip-row compact" aria-label="Common vial amounts">
              {vialPresetMg.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  className={peptideMg === preset ? 'chip active' : 'chip'}
                  onClick={() => setPeptideMgInput(String(preset))}
                >
                  {preset} mg
                </button>
              ))}
            </div>

            <div className="field-row">
              <span className="icon-shell">
                <Icon name="drop" />
              </span>
              <label htmlFor="water-ml">
                <strong>Bacteriostatic water added</strong>
                <span>Total liquid volume added to the vial.</span>
              </label>
              <div className="input-with-unit">
                <input
                  id="water-ml"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  type="number"
                  value={waterMlInput}
                  onChange={(event) => setWaterMlInput(event.target.value)}
                />
                <span>mL</span>
              </div>
            </div>

            <div className="field-row">
              <span className="icon-shell">
                <Icon name="target" />
              </span>
              <label htmlFor="desired-dose">
                <strong>Desired amount per draw</strong>
                <span>Use mcg for small amounts or mg for larger research amounts.</span>
              </label>
              <div className="dose-control">
                <input
                  id="desired-dose"
                  inputMode="decimal"
                  min="0"
                  type="number"
                  value={desiredDoseInput}
                  onChange={(event) => setDesiredDoseInput(event.target.value)}
                />
                <div className="segmented" role="group" aria-label="Dose unit">
                  <button
                    type="button"
                    className={doseUnit === 'mcg' ? 'active' : ''}
                    onClick={() => setDoseUnit('mcg')}
                  >
                    mcg
                  </button>
                  <button
                    type="button"
                    className={doseUnit === 'mg' ? 'active' : ''}
                    onClick={() => setDoseUnit('mg')}
                  >
                    mg
                  </button>
                </div>
              </div>
            </div>

            <div className="chip-row" aria-label="Quick dose presets in micrograms">
              {dosePresetMcg.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  className={
                    doseUnit === 'mcg' && desiredDose === preset ? 'chip active' : 'chip'
                  }
                  onClick={() => {
                    setDoseUnit('mcg')
                    setDesiredDoseInput(String(preset))
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="field-row">
              <span className="icon-shell">
                <Icon name="syringe" />
              </span>
              <label htmlFor="syringe-type">
                <strong>Syringe type</strong>
                <span>{selectedSyringe.helperText}</span>
              </label>
              <select
                id="syringe-type"
                value={syringeId}
                onChange={(event) => setSyringeId(event.target.value)}
              >
                {syringeOptions.map((syringe) => (
                  <option value={syringe.id} key={syringe.id}>
                    {syringe.label}
                  </option>
                ))}
              </select>
            </div>

            {inputIssue ? (
              <p className="input-warning" role="alert">
                {inputIssue}
              </p>
            ) : null}

            <section className="saved-presets" aria-labelledby="saved-presets-title">
              <div className="saved-presets-header">
                <h2 id="saved-presets-title">Saved setups</h2>
                <button type="button" className="ghost-button" onClick={saveCurrentPreset}>
                  <Icon name="save" />
                  Save setup
                </button>
              </div>
              <div className="preset-list">
                {savedPresets.map((preset) => (
                  <button
                    type="button"
                    className="preset-card"
                    key={preset.id}
                    onClick={() => applySavedPreset(preset)}
                  >
                    <span>
                      <strong>
                        {preset.peptideMg} mg vial, {preset.waterMl} mL water,{' '}
                        {preset.desiredDoseMcg} mcg
                      </strong>
                      <small>
                        {getSyringeById(preset.syringeId).shortLabel} - {preset.createdAt}
                      </small>
                    </span>
                    <span aria-hidden="true">Apply</span>
                  </button>
                ))}
              </div>
            </section>
          </form>

          <section className="panel results-panel" aria-labelledby="results-title">
            <div className="panel-heading inline">
              <div>
                <h2 id="results-title">Calculation Results</h2>
                <p>Rounded for practical syringe reading while preserving the exact formula trail.</p>
              </div>
              <span className={calculation?.exceedsCapacity ? 'status warn' : 'status'}>
                <Icon name={calculation?.exceedsCapacity ? 'alert' : 'check'} />
                {calculation?.exceedsCapacity ? 'Check syringe' : 'Inputs look good'}
              </span>
            </div>

            {calculation ? (
              <>
                <div className="result-stack">
                  <ResultRow
                    icon="vial"
                    label="Concentration"
                    help="Peptide concentration in solution"
                    value={`${formatNumber(calculation.concentrationMgPerMl, 2)} mg/mL`}
                  />
                  <ResultRow
                    icon="syringe"
                    label="Draw volume"
                    help="Volume to draw per research amount"
                    value={drawVolumeLabel}
                    detail={`Exact: ${formatNumber(calculation.drawVolumeMl, 4)} mL`}
                  />
                  <ResultRow
                    icon="target"
                    label="Syringe marking"
                    help={calculation.syringe.unitsPerMl === null ? 'mL mark on selected syringe' : 'Units on selected U-100 syringe'}
                    value={syringeUnitLabel}
                    detail={calculation.syringe.unitsPerMl === null ? 'Rounded to syringe increment' : 'Rounded to nearest unit'}
                  />
                  <ResultRow
                    icon="formula"
                    label="Approx. full draws per vial"
                    help="Estimated count before the final partial remainder"
                    value={`${calculation.dosesPerVial} draws`}
                  />
                  <ResultRow
                    icon="drop"
                    label="Remainder after full draws"
                    help="Approximate amount left after whole draws"
                    value={`${formatNumber(calculation.remainingMg, 3)} mg`}
                    detail={`${formatNumber(calculation.remainingMl, 3)} mL`}
                  />
                </div>

                <button type="button" className="copy-button" onClick={copyResults}>
                  <Icon name="copy" />
                  {copyStatus}
                </button>

                {calculation.exceedsCapacity ? (
                  <div className="notice warn" role="alert">
                    <Icon name="alert" />
                    <div>
                      <strong>Draw volume exceeds selected syringe capacity.</strong>
                      <p>
                        {formatNumber(calculation.drawVolumeMl, 2)} mL is greater than the{' '}
                        {formatCompactNumber(calculation.syringe.capacityMl, 2)} mL capacity of{' '}
                        {calculation.syringe.label}.
                      </p>
                      {alternativeSyringes.length > 0 ? (
                        <div className="alternative-list">
                          {alternativeSyringes.map((syringe) => (
                            <button
                              type="button"
                              key={syringe.id}
                              onClick={() => setSyringeId(syringe.id)}
                            >
                              Use {syringe.shortLabel}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {calculation.belowReadableVolume ? (
                  <div className="notice">
                    <Icon name="alert" />
                    <div>
                      <strong>Draw volume is below the selected syringe increment.</strong>
                      <p>
                        Consider increasing reconstitution volume or choosing equipment with finer
                        markings for clearer lab measurement.
                      </p>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="empty-results">
                <Icon name="formula" />
                <p>Enter valid values to calculate concentration, draw volume, and syringe marks.</p>
              </div>
            )}
          </section>
        </section>

        <section className="support-grid" id="formula">
          <div className="panel formula-panel">
            <div className="panel-heading">
              <h2>Formula & Audit Trail</h2>
              <p>Every result is derived from the same transparent conversion steps.</p>
            </div>
            <div className="formula-flow" aria-label="Calculation formulas">
              <div>
                <strong>Concentration</strong>
                <span>Peptide mg / water mL</span>
              </div>
              <div>
                <strong>Draw volume</strong>
                <span>Dose mg / concentration</span>
              </div>
              <div>
                <strong>Syringe units</strong>
                <span>Draw mL x units per mL</span>
              </div>
            </div>
            {calculation ? (
              <div className="audit-line">
                <Icon name="formula" />
                <p>
                  {formatCompactNumber(Number(peptideMgInput), 2)} mg /{' '}
                  {formatCompactNumber(Number(waterMlInput), 2)} mL ={' '}
                  {formatNumber(calculation.concentrationMgPerMl, 2)} mg/mL;{' '}
                  {formatNumber(calculation.desiredDoseMg, 3)} mg /{' '}
                  {formatNumber(calculation.concentrationMgPerMl, 2)} mg/mL ={' '}
                  {formatNumber(calculation.drawVolumeMl, 4)} mL
                  {calculation.syringe.unitsPerMl
                    ? `; ${formatNumber(calculation.drawVolumeMl, 4)} mL x ${
                        calculation.syringe.unitsPerMl
                      } = ${formatCompactNumber(calculation.syringeUnits ?? 0, 0)} units.`
                    : '.'}
                </p>
              </div>
            ) : null}
          </div>

          <div className="panel features-panel">
            <div className="panel-heading">
              <h2>Built For Cleaner Lab Planning</h2>
              <p>More than a basic peptide calculator: the interface surfaces assumptions.</p>
            </div>
            <ul className="feature-list">
              <li>mcg and mg input modes with automatic conversion.</li>
              <li>U-100 unit output plus direct mL syringe output.</li>
              <li>Syringe capacity and very-small-volume warnings.</li>
              <li>Copyable result summary for research notes.</li>
              <li>Saved local presets for repeated vial setups.</li>
            </ul>
          </div>
        </section>

        <section className="faq-section panel" id="faq" aria-labelledby="faq-title">
          <div className="panel-heading">
            <h2 id="faq-title">FAQ</h2>
            <p>Common questions about units, rounding, and research-use scope.</p>
          </div>
          <details>
            <summary>What does mcg mean?</summary>
            <p>
              mcg means microgram. 1 mg equals 1,000 mcg, so 500 mcg equals 0.5 mg.
            </p>
          </details>
          <details>
            <summary>Why is the draw volume rounded?</summary>
            <p>
              The exact draw volume is shown in the detail line, while the primary result rounds to
              the nearest selected syringe increment for practical reading.
            </p>
          </details>
          <details>
            <summary>What if the draw volume exceeds syringe capacity?</summary>
            <p>
              The calculator warns you and suggests larger compatible syringe options when available.
            </p>
          </details>
          <details>
            <summary>Are these calculations suitable for in vivo use?</summary>
            <p>
              No. This calculator is provided for laboratory research planning only and is not for
              human or veterinary use.
            </p>
          </details>
        </section>
      </main>

      <footer className="site-footer">
        <span className="footer-icon">
          <Icon name="vial" />
        </span>
        <div>
          <strong>Research Use Only</strong>
          <p>Not for human or veterinary use. Not for diagnostic or therapeutic procedures.</p>
        </div>
        <p>
          Calculations are estimates and should be independently verified before any laboratory
          workflow. 8 West Bio is not responsible for use of this tool.
        </p>
      </footer>
    </div>
  )
}

export default App

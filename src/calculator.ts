export type DoseUnit = 'mcg' | 'mg'

export type SyringeOption = {
  id: string
  label: string
  shortLabel: string
  capacityMl: number
  incrementMl: number
  unitsPerMl: number | null
  helperText: string
}

export type CalculatorInput = {
  peptideMg: number
  waterMl: number
  desiredDose: number
  doseUnit: DoseUnit
  syringeId: string
}

export type CalculationResult = {
  syringe: SyringeOption
  concentrationMgPerMl: number
  desiredDoseMg: number
  desiredDoseMcg: number
  drawVolumeMl: number
  roundedDrawVolumeMl: number
  syringeUnits: number | null
  dosesPerVial: number
  remainingMg: number
  remainingMl: number
  exceedsCapacity: boolean
  belowReadableVolume: boolean
}

export const syringeOptions: SyringeOption[] = [
  {
    id: 'u100-1ml',
    label: 'U-100 insulin syringe',
    shortLabel: 'U-100',
    capacityMl: 1,
    incrementMl: 0.01,
    unitsPerMl: 100,
    helperText: '100 units = 1 mL',
  },
  {
    id: 'u100-0-5ml',
    label: '0.5 mL U-100 insulin syringe',
    shortLabel: '0.5 mL U-100',
    capacityMl: 0.5,
    incrementMl: 0.01,
    unitsPerMl: 100,
    helperText: '50 units = 0.5 mL',
  },
  {
    id: 'u100-0-3ml',
    label: '0.3 mL U-100 insulin syringe',
    shortLabel: '0.3 mL U-100',
    capacityMl: 0.3,
    incrementMl: 0.01,
    unitsPerMl: 100,
    helperText: '30 units = 0.3 mL',
  },
  {
    id: 'luer-1ml',
    label: '1 mL syringe',
    shortLabel: '1 mL',
    capacityMl: 1,
    incrementMl: 0.01,
    unitsPerMl: null,
    helperText: 'Read directly from the mL markings',
  },
  {
    id: 'luer-3ml',
    label: '3 mL syringe',
    shortLabel: '3 mL',
    capacityMl: 3,
    incrementMl: 0.05,
    unitsPerMl: null,
    helperText: 'Useful when larger draw volumes are required',
  },
]

export const dosePresetMcg = [100, 250, 500, 750, 1000, 1500, 2000]

export const vialPresetMg = [5, 10, 15, 30, 50]

export function parsePositiveNumber(value: string) {
  const normalized = Number(value)
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null
}

export function roundToIncrement(value: number, increment: number) {
  if (!Number.isFinite(value) || increment <= 0) {
    return value
  }

  return Math.round(value / increment) * increment
}

export function getSyringeById(syringeId: string) {
  return syringeOptions.find((syringe) => syringe.id === syringeId) ?? syringeOptions[0]
}

export function calculateDose(input: CalculatorInput): CalculationResult | null {
  const { peptideMg, waterMl, desiredDose, doseUnit } = input
  const syringe = getSyringeById(input.syringeId)

  if (
    !Number.isFinite(peptideMg) ||
    !Number.isFinite(waterMl) ||
    !Number.isFinite(desiredDose) ||
    peptideMg <= 0 ||
    waterMl <= 0 ||
    desiredDose <= 0
  ) {
    return null
  }

  const desiredDoseMg = doseUnit === 'mcg' ? desiredDose / 1000 : desiredDose

  if (desiredDoseMg <= 0 || desiredDoseMg > peptideMg * 100) {
    return null
  }

  const concentrationMgPerMl = peptideMg / waterMl
  const drawVolumeMl = desiredDoseMg / concentrationMgPerMl
  const roundedDrawVolumeMl = roundToIncrement(drawVolumeMl, syringe.incrementMl)
  const syringeUnits =
    syringe.unitsPerMl === null ? null : roundToIncrement(drawVolumeMl * syringe.unitsPerMl, 1)
  const dosesPerVial = Math.floor(peptideMg / desiredDoseMg)
  const usedMg = dosesPerVial * desiredDoseMg
  const remainingMg = Math.max(peptideMg - usedMg, 0)
  const remainingMl = remainingMg / concentrationMgPerMl

  return {
    syringe,
    concentrationMgPerMl,
    desiredDoseMg,
    desiredDoseMcg: desiredDoseMg * 1000,
    drawVolumeMl,
    roundedDrawVolumeMl,
    syringeUnits,
    dosesPerVial,
    remainingMg,
    remainingMl,
    exceedsCapacity: drawVolumeMl > syringe.capacityMl,
    belowReadableVolume: drawVolumeMl > 0 && drawVolumeMl < syringe.incrementMl,
  }
}

import type { Brownfield } from '../api/brownfields'

export type SortOrder = 'name-asc' | 'name-desc' | 'area-asc' | 'area-desc'

export type BrownfieldFilters = {
  query: string
  minArea: string
  maxArea: string
  sort: SortOrder
}

export const DEFAULT_FILTERS: BrownfieldFilters = {
  query: '', minArea: '', maxArea: '', sort: 'name-asc',
}

export type AreaSummary = {
  sumHa: number | null
  knownCount: number
  missingCount: number
}

export function knownArea(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Súčet zdrojového VYMERA_HA. Chýbajúca alebo neplatná výmera nie je nula. */
export function summarizeArea(features: Brownfield[]): AreaSummary {
  const values = features.map((feature) => feature.properties.VYMERA_HA).filter(knownArea)
  return {
    sumHa: values.length > 0 ? values.reduce((sum, area) => sum + area, 0) :
      features.length === 0 ? 0 : null,
    knownCount: values.length,
    missingCount: features.length - values.length,
  }
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('sk')
    .trim().replace(/\s+/g, ' ')
}

function parseBound(text: string): number | undefined | 'invalid' {
  if (!text.trim()) return undefined
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text.trim())) return 'invalid'
  const number = Number(text.trim().replace(',', '.'))
  return knownArea(number) ? number : 'invalid'
}

const collator = new Intl.Collator('sk', { sensitivity: 'base', numeric: true })

function compareNames(a: Brownfield, b: Brownfield, descending = false): number {
  const left = a.properties.NAZOV?.trim()
  const right = b.properties.NAZOV?.trim()
  if (!left && right) return 1
  if (left && !right) return -1
  const comparison = collator.compare(left ?? '', right ?? '')
  return comparison * (descending ? -1 : 1) || a.properties.OBJECTID - b.properties.OBJECTID
}

export function analyzeBrownfields(features: Brownfield[], filters: BrownfieldFilters) {
  const min = parseBound(filters.minArea)
  const max = parseBound(filters.maxArea)
  const errors = {
    minArea: min === 'invalid' ? 'Minimum musí byť nezáporné číslo v ha.' : '',
    maxArea: max === 'invalid' ? 'Maximum musí byť nezáporné číslo v ha.' : '',
    range: typeof min === 'number' && typeof max === 'number' && min > max
      ? 'Minimum nesmie byť väčšie než maximum.' : '',
  }
  const valid = !Object.values(errors).some(Boolean)
  const query = normalize(filters.query)
  const numericQuery = /^\d+$/.test(query) ? Number(query) : null
  const visible = valid ? features.filter(({ properties }) => {
    const matchesQuery = !query || (numericQuery !== null
      ? properties.OBJECTID === numericQuery || properties.SPEC_CISLO === numericQuery
      : normalize(properties.NAZOV ?? '').includes(query))
    if (!matchesQuery) return false
    const area = properties.VYMERA_HA
    if (min !== undefined || max !== undefined) {
      if (!knownArea(area)) return false
      if (typeof min === 'number' && area < min) return false
      if (typeof max === 'number' && area > max) return false
    }
    return true
  }) : []

  visible.sort((a, b) => {
    if (filters.sort.startsWith('name')) return compareNames(a, b, filters.sort === 'name-desc')
    const left = a.properties.VYMERA_HA
    const right = b.properties.VYMERA_HA
    if (!knownArea(left) && knownArea(right)) return 1
    if (knownArea(left) && !knownArea(right)) return -1
    const comparison = knownArea(left) && knownArea(right) ? left - right : 0
    return comparison * (filters.sort === 'area-desc' ? -1 : 1) || compareNames(a, b)
  })

  return {
    valid, errors, features: visible,
    totalCount: features.length,
    totalArea: summarizeArea(features),
    filteredArea: summarizeArea(visible),
  }
}

export type BrownfieldAnalysis = ReturnType<typeof analyzeBrownfields>

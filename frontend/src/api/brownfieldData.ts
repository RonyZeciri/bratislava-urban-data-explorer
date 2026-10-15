import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'

export const BROWNFIELDS_SOURCE_URL = 'https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/8'

export type BrownfieldProperties = {
  OBJECTID: number
  SPEC_CISLO?: number | null
  VYMERA_HA?: number | null
  NAZOV?: string | null
  ADRESA?: string | null
  MC?: string | null
  PR_VYU_POP?: string | null
  N_FUNK_POP?: string | null
  ZAMER?: string | null
  DRUH_VLA?: string | null
  NKP_NAZOV?: string | null
  SEZ_POPIS?: string | null
  ZONA_OZNACENIE?: string | null
}

export type Brownfield = Feature<Polygon | MultiPolygon, BrownfieldProperties>
export type BrownfieldsCollection = FeatureCollection<Polygon | MultiPolygon, BrownfieldProperties>

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isRing(value: unknown): boolean {
  return Array.isArray(value) && value.length >= 4 && value.every(
    (position: unknown) => Array.isArray(position) && position.length >= 2 &&
      position.every((n: unknown) => typeof n === 'number' && Number.isFinite(n)),
  )
}

function isPolygon(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every(isRing)
}

function isBrownfield(value: unknown): value is Brownfield {
  if (!isRecord(value) || value.type !== 'Feature' || !isRecord(value.properties) ||
      !isRecord(value.geometry) || !Number.isInteger(value.properties.OBJECTID)) return false
  const properties = value.properties
  const numberFields = ['SPEC_CISLO', 'VYMERA_HA']
  const textFields = ['NAZOV', 'ADRESA', 'MC', 'PR_VYU_POP', 'N_FUNK_POP', 'ZAMER',
    'DRUH_VLA', 'NKP_NAZOV', 'SEZ_POPIS', 'ZONA_OZNACENIE']
  if (!numberFields.every((field) => properties[field] == null ||
    (typeof properties[field] === 'number' && Number.isFinite(properties[field])))) return false
  if (!textFields.every((field) => properties[field] == null || typeof properties[field] === 'string')) return false
  const geometry = value.geometry
  return geometry.type === 'Polygon' ? isPolygon(geometry.coordinates) :
    geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates) &&
      geometry.coordinates.length > 0 && geometry.coordinates.every(isPolygon)
}

export function validateBrownfields(data: unknown): BrownfieldsCollection {
  if (!isRecord(data) || data.type !== 'FeatureCollection' ||
      !Array.isArray(data.features) || !data.features.every(isBrownfield)) {
    throw new Error('Zdroj vrátil neplatnú dátovú vrstvu.')
  }
  const features: Brownfield[] = data.features
  if (new Set(features.map((f) => f.properties.OBJECTID)).size !== features.length) {
    throw new Error('Dátová vrstva obsahuje duplicitné identifikátory.')
  }
  return { type: 'FeatureCollection', features }
}

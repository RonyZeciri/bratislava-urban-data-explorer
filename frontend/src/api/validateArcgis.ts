import { isRecord, validateBrownfields } from './brownfieldData.ts'
import type { BrownfieldsCollection } from './brownfieldData.ts'

// Presné overené polia vrstvy 8; bez vlastníckych mien a interných ciest.
export const ARCGIS_FIELDS = {
  OBJECTID: 'esriFieldTypeOID', SPEC_CISLO: 'esriFieldTypeInteger',
  NAZOV: 'esriFieldTypeString', ADRESA: 'esriFieldTypeString', MC: 'esriFieldTypeString',
  VYMERA_HA: 'esriFieldTypeDouble', PR_VYU_POP: 'esriFieldTypeString',
  N_FUNK_POP: 'esriFieldTypeString', ZAMER: 'esriFieldTypeString', DRUH_VLA: 'esriFieldTypeString',
  NKP_NAZOV: 'esriFieldTypeString', SEZ_POPIS: 'esriFieldTypeString', ZONA_OZNACENIE: 'esriFieldTypeString',
} as const

export function validateMetadata(data: Record<string, unknown>) {
  const fields = data.fields
  if (data.objectIdField !== 'OBJECTID' || data.geometryType !== 'esriGeometryPolygon' ||
      !Number.isSafeInteger(data.maxRecordCount) || (data.maxRecordCount as number) <= 0 ||
      typeof data.supportedQueryFormats !== 'string' || !data.supportedQueryFormats.toLowerCase().split(/,\s*/).includes('geojson') ||
      typeof data.capabilities !== 'string' || !data.capabilities.split(',').map((s) => s.trim()).includes('Query') ||
      !Array.isArray(fields) || !Object.entries(ARCGIS_FIELDS).every(([name, type]) =>
        fields.some((f: unknown) => isRecord(f) && f.name === name && f.type === type))) {
    throw new Error('ArcGIS: schéma, identifikačné pole alebo limit vrstvy sa zmenili.')
  }
  const edits = data.editingInfo
  if (!isRecord(edits) || !['lastEditDate', 'schemaLastEditDate', 'dataLastEditDate'].every((key) => Number.isSafeInteger(edits[key]))) {
    throw new Error('ArcGIS: chýbajú spoľahlivé metadáta zmien vrstvy.')
  }
  return {
    batchSize: Math.min(data.maxRecordCount as number, 500),
    revision: JSON.stringify([edits.lastEditDate, edits.schemaLastEditDate, edits.dataLastEditDate]),
  }
}

export function validateCount(data: Record<string, unknown>): number {
  if (!Number.isSafeInteger(data.count) || (data.count as number) < 0 || (data.count as number) > 10000) {
    throw new Error('ArcGIS: neplatný počet alebo prekročený ochranný limit 10 000 objektov.')
  }
  return data.count as number
}

export function validateIds(data: Record<string, unknown>, count: number): number[] {
  const ids = data.objectIds
  if (data.objectIdFieldName !== 'OBJECTID' || !Array.isArray(ids) ||
      !ids.every(Number.isSafeInteger) || ids.length !== count || new Set(ids).size !== count) {
    throw new Error('ArcGIS: počet a úplný zoznam jedinečných OBJECTID nesúhlasia.')
  }
  return (ids as number[]).slice().sort((a, b) => a - b)
}

export function validateArcgisCollection(data: unknown, expectedIds: number[]): BrownfieldsCollection {
  const crs = isRecord(data) ? data.crs : undefined
  const knownCrs = crs == null || (isRecord(crs) && crs.type === 'name' && isRecord(crs.properties) &&
    ['EPSG:4326', 'OGC:CRS84', 'urn:ogc:def:crs:EPSG::4326', 'urn:ogc:def:crs:OGC:1.3:CRS84'].includes(String(crs.properties.name)))
  if (!isRecord(data) || data.exceededTransferLimit === true || !knownCrs) {
    throw new Error('ArcGIS: skrátená odpoveď alebo neočakávaný súradnicový systém.')
  }
  const collection = validateBrownfields(data)
  const expected = new Set(expectedIds)
  if (collection.features.length !== expected.size ||
      !collection.features.every((f) => expected.has(f.properties.OBJECTID))) {
    throw new Error('ArcGIS: neúplná dávka alebo iné OBJECTID než požadované.')
  }
  for (const feature of collection.features) {
    const props = feature.properties
    if (!Number.isSafeInteger(props.OBJECTID) || !Object.keys(ARCGIS_FIELDS).every((key) => Object.hasOwn(props, key)) ||
        (props.SPEC_CISLO != null && !Number.isSafeInteger(props.SPEC_CISLO))) {
      throw new Error('ArcGIS: chýbajú požadované atribúty alebo majú nesprávny typ.')
    }
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
    for (const polygon of polygons) for (const ring of polygon) {
      // Rovnaký veľkorysý regionálny rámec ako backend; nejde o hranicu mesta.
      if (!ring.every((p) => (p.length === 2 || p.length === 3) &&
          p[0] >= 16.8 && p[0] <= 17.4 && p[1] >= 47.9 && p[1] <= 48.4)) {
        throw new Error('ArcGIS: súradnice sú mimo regionálneho rámca Bratislavy.')
      }
      const first = ring[0], last = ring[ring.length - 1]
      const area = ring.slice(1).reduce((sum, b, i) => sum + ring[i][0] * b[1] - b[0] * ring[i][1], 0)
      if (first.length !== last.length || !first.every((n, i) => n === last[i]) ||
          new Set(ring.map((p) => `${p[0]},${p[1]}`)).size < 3 || area === 0) {
        throw new Error('ArcGIS: neuzavretý alebo degenerovaný kruh polygónu.')
      }
    }
  }
  return collection
}

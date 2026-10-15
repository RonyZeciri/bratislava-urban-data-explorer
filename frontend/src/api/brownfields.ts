export { BROWNFIELDS_SOURCE_URL } from './brownfieldData'
export type { Brownfield, BrownfieldProperties, BrownfieldsCollection } from './brownfieldData'
import { validateBrownfields } from './brownfieldData'
import type { BrownfieldsCollection } from './brownfieldData'
import { config } from '../config'
import { apiUrl } from '../config/parseConfig'
import { loadForGisMode } from '../domain/gisMode'
import { downloadArcgis } from './arcgis'
import type { ArcgisResult } from './arcgis'
import { createSharedLoad } from './sharedLoad'

export type BrownfieldsResult = ArcgisResult | { data: BrownfieldsCollection; source: 'local-api'; acquiredAt: null }
const sharedArcgis = createSharedLoad(downloadArcgis)

export function getBrownfieldsResult(signal: AbortSignal): Promise<BrownfieldsResult> {
  return loadForGisMode<BrownfieldsResult>(config.gisSource,
    async () => ({ data: await getLocalBrownfields(signal), source: 'local-api', acquiredAt: null }),
    () => sharedArcgis(signal))
}

export function getBrownfields(signal: AbortSignal): Promise<BrownfieldsCollection> {
  return getBrownfieldsResult(signal).then((result) => result.data)
}

async function getLocalBrownfields(signal: AbortSignal): Promise<BrownfieldsCollection> {
  const response = await fetch(apiUrl(config, '/api/brownfields'), { signal })
  if (!response.ok) {
    throw new Error(response.status === 503
      ? 'GIS snímka nie je dostupná alebo je jej poskytovanie vypnuté. Skontroluj konfiguráciu a README.'
      : `Načítanie údajov zlyhalo (HTTP ${response.status}).`)
  }
  const data: unknown = await response.json()
  return validateBrownfields(data)
}

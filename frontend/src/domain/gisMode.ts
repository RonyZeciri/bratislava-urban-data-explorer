import type { GisSource } from '../config/parseConfig'

export const MIB_EXPERIENCE_URL = 'https://experience.arcgis.com/experience/e25edd3fc2e94da483798fd5dbf3500e/page/brownfieldy'

export function gisAvailability(source: GisSource) {
  if (source !== 'disabled') return null
  return { status: 'disabled' as const, message: 'GIS dáta vo verejnej ukážke nie sú dostupné. Zobrazovanie údajov je vypnuté.' }
}

/** Jediná brána načítania GIS; zakázané režimy nespustia ani lokálny loader. */
export function loadForGisMode<T>(source: GisSource, localLoader: () => Promise<T>, arcgisLoader: () => Promise<T>): Promise<T> {
  const unavailable = gisAvailability(source)
  if (unavailable) return Promise.reject(new Error(unavailable.message))
  return source === 'arcgis' ? arcgisLoader() : localLoader()
}

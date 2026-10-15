import { BROWNFIELDS_SOURCE_URL, isRecord } from './brownfieldData.ts'
import type { BrownfieldsCollection } from './brownfieldData.ts'
import { abortable, delay } from './abort.ts'
import { ARCGIS_FIELDS, validateArcgisCollection, validateCount, validateIds, validateMetadata } from './validateArcgis.ts'

export type ArcgisResult = { data: BrownfieldsCollection; acquiredAt: string; source: 'arcgis' }
export class ArcgisError extends Error {
  retryAt?: number
  constructor(message: string, retryAt?: number) { super(message); this.name = 'ArcgisError'; this.retryAt = retryAt }
}
type Fetcher = (url: string, init: RequestInit) => Promise<Response>
type Policy = { requestTimeoutMs: number; totalTimeoutMs: number; maxResponseBytes: number; maxTotalBytes: number; retryDelayMs: number }
const DEFAULT_POLICY: Policy = {
  requestTimeoutMs: 15000, totalTimeoutMs: 60000,
  maxResponseBytes: 25000000, maxTotalBytes: 50000000, retryDelayMs: 1000,
}

function retryDelay(header: string | null, fallback: number): number {
  if (header === null) return fallback
  if (/^\d+$/.test(header.trim())) return Number(header) * 1000
  const date = Date.parse(header)
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : fallback
}

/** Pevný endpoint; transport/politika sú injektovateľné len pre syntetické testy. */
export async function downloadArcgis(signal: AbortSignal, fetcher: Fetcher = fetch, overrides: Partial<Policy> = {}): Promise<ArcgisResult> {
  signal.throwIfAborted()
  const policy = { ...DEFAULT_POLICY, ...overrides }
  const controller = new AbortController()
  const abort = () => controller.abort(signal.reason)
  signal.addEventListener('abort', abort, { once: true })
  const totalTimer = setTimeout(() => controller.abort(new DOMException('ArcGIS prekročil celkový časový limit.', 'TimeoutError')), policy.totalTimeoutMs)
  let totalBytes = 0
  let retryNotBefore = 0

  async function json(path: '' | '/query', params: Record<string, string | number>): Promise<Record<string, unknown>> {
    const url = `${BROWNFIELDS_SOURCE_URL}${path}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}`
    for (let attempt = 0; attempt < 2; attempt++) {
      controller.signal.throwIfAborted()
      const request = new AbortController()
      const abortRequest = () => request.abort(controller.signal.reason)
      controller.signal.addEventListener('abort', abortRequest, { once: true })
      const timer = setTimeout(() => request.abort(new DOMException('ArcGIS prekročil časový limit požiadavky.', 'TimeoutError')), policy.requestTimeoutMs)
      let waitMs: number | undefined
      try {
        const response = await abortable(fetcher(url, {
          signal: request.signal, credentials: 'omit', mode: 'cors', redirect: 'error', cache: 'no-store',
        }), request.signal)
        if (!response.ok) {
          void response.body?.cancel().catch(() => undefined)
          if ([401, 403, 498, 499].includes(response.status)) throw new ArcgisError('ArcGIS odmietol verejný prístup. Autentifikáciu neobchádzame.')
          const transient = response.status === 429 || response.status >= 500
          const backoff = retryDelay(response.headers.get('Retry-After'), policy.retryDelayMs)
          const retryAt = transient ? Date.now() + Math.max(backoff, policy.retryDelayMs) : undefined
          if (retryAt !== undefined) retryNotBefore = Math.max(retryNotBefore, retryAt)
          if (!transient || attempt === 1 || backoff > 30000) {
            throw new ArcgisError(`ArcGIS nie je dostupný (HTTP ${response.status}). Skúste to neskôr.`, retryAt)
          }
          waitMs = Math.max(backoff, policy.retryDelayMs)
        } else {
          const length = response.headers.get('Content-Length')
          if (length !== null && Number(length) > policy.maxResponseBytes) {
            void response.body?.cancel().catch(() => undefined)
            throw new ArcgisError('ArcGIS odpoveď prekročila povolenú veľkosť.')
          }
          const reader = response.body?.getReader()
          if (!reader) throw new ArcgisError('ArcGIS vrátil prázdnu odpoveď.')
          const chunks: Uint8Array[] = []
          let bytes = 0
          try {
            while (true) {
              const part = await abortable(reader.read(), request.signal)
              if (part.done) break
              bytes += part.value.byteLength
              totalBytes += part.value.byteLength
              if (bytes > policy.maxResponseBytes || totalBytes > policy.maxTotalBytes) throw new ArcgisError('ArcGIS odpoveď prekročila povolenú veľkosť.')
              chunks.push(part.value)
            }
          } catch (error) {
            void reader.cancel().catch(() => undefined)
            throw error
          } finally { reader.releaseLock() }
          const raw = new Uint8Array(bytes)
          let offset = 0
          for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.byteLength }
          let data: unknown
          try { data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)) } catch {
            throw new ArcgisError('ArcGIS vrátil neplatný JSON.')
          }
          if (!isRecord(data)) throw new ArcgisError('ArcGIS vrátil nesprávnu štruktúru odpovede.')
          if ('error' in data) {
            const code = isRecord(data.error) ? data.error.code : undefined
            const hint = response.headers.get('Retry-After')
            const retryAt = hint !== null ? Date.now() + retryDelay(hint, policy.retryDelayMs) : undefined
            if ([401, 403, 498, 499].includes(Number(code))) throw new ArcgisError('ArcGIS vyžaduje oprávnenie. Autentifikáciu neobchádzame.', retryAt)
            throw new ArcgisError('ArcGIS oznámil chybu v odpovedi. Nejde o prázdny dataset.', retryAt)
          }
          return data
        }
      } catch (error) {
        if (controller.signal.aborted) throw controller.signal.reason
        if (error instanceof ArcgisError) throw error
        if (request.signal.aborted) throw request.signal.reason
        // Fetch/stream sieťová chyba: najviac jedno opakovanie. JSON/validácia sa neopakujú.
        if (attempt === 1) throw new ArcgisError('ArcGIS sa nepodarilo načítať. Skontrolujte internet alebo CORS služby.')
        waitMs = policy.retryDelayMs
      } finally {
        clearTimeout(timer)
        controller.signal.removeEventListener('abort', abortRequest)
      }
      if (waitMs !== undefined) {
        const jitter = policy.retryDelayMs > 0 ? Math.random() * 250 : 0
        await delay(waitMs + jitter, controller.signal)
      }
    }
    throw new ArcgisError('ArcGIS sa nepodarilo načítať.')
  }

  try {
    const metadata = validateMetadata(await json('', { f: 'json' }))
    const countParams = { where: '1=1', returnCountOnly: 'true', f: 'json' }
    const count = validateCount(await json('/query', countParams))
    const ids = validateIds(await json('/query', { where: '1=1', returnIdsOnly: 'true', f: 'json' }), count)
    if (Math.ceil(ids.length / metadata.batchSize) > 50) throw new ArcgisError('ArcGIS export by prekročil ochranný limit 50 dávok.')
    const data: BrownfieldsCollection = { type: 'FeatureCollection', features: [] }
    for (let start = 0; start < ids.length; start += metadata.batchSize) {
      controller.signal.throwIfAborted()
      const batchIds = ids.slice(start, start + metadata.batchSize)
      const batch = validateArcgisCollection(await json('/query', {
        objectIds: batchIds.join(','), outFields: Object.keys(ARCGIS_FIELDS).join(','),
        returnGeometry: 'true', outSR: 4326, f: 'geojson',
      }), batchIds)
      data.features.push(...batch.features)
    }
    validateArcgisCollection(data, ids)
    const finalCount = validateCount(await json('/query', countParams))
    const finalMetadata = validateMetadata(await json('', { f: 'json' }))
    if (finalCount !== count || finalMetadata.revision !== metadata.revision) throw new ArcgisError('ArcGIS vrstva sa počas načítania zmenila. Skúste načítanie zopakovať.')
    controller.signal.throwIfAborted()
    data.features.sort((a, b) => a.properties.OBJECTID - b.properties.OBJECTID)
    return { data, source: 'arcgis', acquiredAt: new Date().toISOString() }
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError' && retryNotBefore > Date.now()) {
      throw new ArcgisError('ArcGIS žiada počkať dlhšie než povoľuje časový limit načítania.', retryNotBefore)
    }
    throw error
  } finally {
    clearTimeout(totalTimer)
    signal.removeEventListener('abort', abort)
  }
}

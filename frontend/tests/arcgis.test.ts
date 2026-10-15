// TEST_ONLY: všetky odpovede a geometrie sú syntetické, žiadny živý ArcGIS.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { downloadArcgis, ArcgisError } from '../src/api/arcgis.ts'
import { ARCGIS_FIELDS, validateArcgisCollection } from '../src/api/validateArcgis.ts'
import { createSharedLoad } from '../src/api/sharedLoad.ts'
import { delay } from '../src/api/abort.ts'

const signal = () => new AbortController().signal
const fast = { retryDelayMs: 0 }
function metadata(limit = 2) {
  return { objectIdField: 'OBJECTID', geometryType: 'esriGeometryPolygon', maxRecordCount: limit,
    supportedQueryFormats: 'JSON, geoJSON', capabilities: 'Query',
    fields: Object.entries(ARCGIS_FIELDS).map(([name, type]) => ({ name, type })),
    editingInfo: { lastEditDate: 1, schemaLastEditDate: 1, dataLastEditDate: 1 } }
}
function feature(id: number) {
  return { type: 'Feature', properties: { ...Object.fromEntries(Object.keys(ARCGIS_FIELDS).map((k) => [k, null])),
    OBJECTID: id, NAZOV: 'TEST_ONLY', SPEC_CISLO: id, VYMERA_HA: 0 },
    geometry: { type: 'Polygon', coordinates: [[[17, 48], [17.01, 48], [17, 48.01], [17, 48]]] } }
}
function collection(ids: number[]) { return { type: 'FeatureCollection', features: ids.map(feature) } }
const response = (data: unknown, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers })

function service(count = 3, limit = 2, change?: (data: Record<string, unknown>, url: URL, call: number) => unknown) {
  const urls: URL[] = []
  const fetcher = async (url: string, init: RequestInit) => {
    const parsed = new URL(url)
    urls.push(parsed)
    assert.equal(init.credentials, 'omit')
    assert.equal(init.cache, 'no-store')
    assert.equal(parsed.origin, 'https://services8.arcgis.com')
    assert.ok(parsed.pathname.endsWith('/FeatureServer/8') || parsed.pathname.endsWith('/FeatureServer/8/query'))
    const params = parsed.searchParams
    const data = !parsed.pathname.endsWith('/query') ? metadata(limit) : params.has('returnCountOnly') ? { count } :
      params.has('returnIdsOnly') ? { objectIdFieldName: 'OBJECTID', objectIds: Array.from({ length: count }, (_, i) => i + 1) } :
        collection(params.get('objectIds')!.split(',').map(Number))
    return response(change ? change(data, parsed, urls.length) : data)
  }
  return { fetcher, urls }
}

test('complete dynamic count, sequential batches, explicit fields and null attributes', async () => {
  const mock = service()
  const result = await downloadArcgis(signal(), mock.fetcher, fast)
  assert.equal(result.source, 'arcgis')
  assert.ok(Number.isFinite(Date.parse(result.acquiredAt)))
  assert.deepEqual(result.data.features.map((f) => f.properties.OBJECTID), [1, 2, 3])
  assert.equal(result.data.features[0].properties.MC, null)
  const batches = mock.urls.filter((u) => u.searchParams.has('objectIds'))
  assert.equal(batches.length, 2)
  for (const u of batches) {
    assert.equal(u.searchParams.get('outSR'), '4326')
    assert.equal(u.searchParams.get('f'), 'geojson')
    assert.equal(u.searchParams.get('outFields'), Object.keys(ARCGIS_FIELDS).join(','))
  }
  assert.equal(mock.urls.length, 7)
})

test('service limit above 500 is capped and valid zero count remains empty', async () => {
  const mock = service(501, 2000)
  assert.equal((await downloadArcgis(signal(), mock.fetcher, fast)).data.features.length, 501)
  assert.deepEqual(mock.urls.filter((u) => u.searchParams.has('objectIds')).map((u) => u.searchParams.get('objectIds')!.split(',').length), [500, 1])
  const empty = service(0)
  assert.equal((await downloadArcgis(signal(), empty.fetcher, fast)).data.features.length, 0)
  assert.equal(empty.urls.some((u) => u.searchParams.has('objectIds')), false)
})

test('schema, identification field, unsupported format and changed revision fail closed', async () => {
  for (const patch of [{ objectIdField: 'OTHER' }, { maxRecordCount: 0 }, { fields: [] }, { supportedQueryFormats: 'JSON' }]) {
    const mock = service(1, 2, (data, url) => url.pathname.endsWith('/query') ? data : { ...data, ...patch })
    await assert.rejects(downloadArcgis(signal(), mock.fetcher, fast), /schéma/)
  }
  const changed = service(1, 2, (data, url, call) => !url.pathname.endsWith('/query') && call > 1
    ? { ...data, editingInfo: { lastEditDate: 2, schemaLastEditDate: 1, dataLastEditDate: 2 } } : data)
  await assert.rejects(downloadArcgis(signal(), changed.fetcher, fast), /počas načítania zmenila/)
})

test('invalid count and count/ID mismatch or duplicate source IDs are rejected', async () => {
  for (const count of [-1, 1.5, 10001, '3']) {
    const mock = service(1, 2, (data, url) => url.searchParams.has('returnCountOnly') ? { count } : data)
    await assert.rejects(downloadArcgis(signal(), mock.fetcher, fast), /počet|limit/)
  }
  for (const objectIds of [[1], [1, 1, 3], [1, 2, '3']]) {
    const mock = service(3, 2, (data, url) => url.searchParams.has('returnIdsOnly') ? { ...data, objectIds } : data)
    await assert.rejects(downloadArcgis(signal(), mock.fetcher, fast), /OBJECTID/)
  }
})

test('incomplete batches, duplicates, wrong IDs and exceeded transfer limit never return partial data', async () => {
  for (const bad of [collection([]), collection([1, 1]), collection([99, 2]), { ...collection([1, 2]), exceededTransferLimit: true }]) {
    const mock = service(3, 2, (data, url) => url.searchParams.has('objectIds') ? bad : data)
    await assert.rejects(downloadArcgis(signal(), mock.fetcher, fast))
  }
  let counts = 0
  const changed = service(1, 2, (data, url) => url.searchParams.has('returnCountOnly') && ++counts === 2 ? { count: 2 } : data)
  await assert.rejects(downloadArcgis(signal(), changed.fetcher, fast), /zmenila/)
})

test('Polygon/MultiPolygon and WGS84 legacy CRS accepted, malformed coordinates/rings rejected', () => {
  const multi = collection([1])
  const geometry = { type: 'MultiPolygon', coordinates: [multi.features[0].geometry.coordinates] }
  assert.equal(validateArcgisCollection({ ...multi, features: [{ ...multi.features[0], geometry }] }, [1]).features.length, 1)
  assert.doesNotThrow(() => validateArcgisCollection({ ...multi, crs: { type: 'name', properties: { name: 'EPSG:4326' } } }, [1]))
  for (const ring of [
    [[17, 48], [17.01, 48], [17, 48.01], [17.02, 48]],
    [[17, 48], [17, 48], [17, 48], [17, 48]],
    [[48, 17], [48.01, 17], [48, 17.01], [48, 17]],
    [[17, 48], [NaN, 48], [17, 48.01], [17, 48]],
    [[170, 48], [170.01, 48], [170, 48.01], [170, 48]],
  ]) {
    const bad = collection([1]); bad.features[0].geometry.coordinates = [ring]
    assert.throws(() => validateArcgisCollection(bad, [1]))
  }
  for (const geometry of [null, { type: 'Point', coordinates: [17, 48] }, { type: 'MultiPolygon', coordinates: [] }]) {
    assert.throws(() => validateArcgisCollection({ ...multi, features: [{ ...multi.features[0], geometry }] }, [1]))
  }
  assert.throws(() => validateArcgisCollection({ ...multi, crs: { type: 'name', properties: { name: 'EPSG:3857' } } }, [1]))
})

test('missing or invalid attributes are errors; null descriptions and zero area are kept', () => {
  const data = collection([1])
  assert.equal(validateArcgisCollection(data, [1]).features[0].properties.VYMERA_HA, 0)
  for (const patch of [{ MC: 7 }, { VYMERA_HA: '1.5' }, { SPEC_CISLO: 1.5 }, { OBJECTID: 1.1 }]) {
    assert.throws(() => validateArcgisCollection({ ...data, features: [{ ...data.features[0], properties: { ...data.features[0].properties, ...patch } }] }, [1]))
  }
  assert.throws(() => validateArcgisCollection({ type: 'FeatureCollection', features: [
    { ...data.features[0], properties: { OBJECTID: 1 } },
  ] }, [1]))
})

test('HTTP failure and ArcGIS JSON errors including authentication are not empty datasets', async () => {
  for (const status of [400, 401, 403, 498, 499]) {
    let calls = 0
    await assert.rejects(downloadArcgis(signal(), async () => { calls++; return response({}, status) }, fast))
    assert.equal(calls, 1)
  }
  for (const code of [400, 403, 499, 500]) {
    let calls = 0
    await assert.rejects(downloadArcgis(signal(), async () => { calls++; return response({ error: { code } }) }, fast))
    assert.equal(calls, 1)
  }
})

test('transient HTTP/network errors retry once; persistent errors stop', async () => {
  for (const status of [429, 500, 502, 503, 504]) {
    const mock = service(1)
    let calls = 0
    const result = await downloadArcgis(signal(), async (url, init) => ++calls === 1 ? response({}, status, { 'Retry-After': '0' }) : mock.fetcher(url, init), fast)
    assert.equal(result.data.features.length, 1)
    calls = 0
    await assert.rejects(downloadArcgis(signal(), async () => { calls++; return response({}, status) }, fast))
    assert.equal(calls, 2)
  }
  const mock = service(1)
  let calls = 0
  await downloadArcgis(signal(), async (url, init) => { if (++calls === 1) throw new TypeError('TEST_ONLY network'); return mock.fetcher(url, init) }, fast)
  calls = 0
  await assert.rejects(downloadArcgis(signal(), async () => { calls++; throw new TypeError('TEST_ONLY network') }, fast), /internet|CORS/)
  assert.equal(calls, 2)
})

test('long Retry-After seconds or HTTP date prevent automatic retry and expose cooldown', async () => {
  for (const header of ['120', new Date(Date.now() + 120000).toUTCString()]) {
    let calls = 0
    const started = Date.now()
    await assert.rejects(downloadArcgis(signal(), async () => { calls++; return response({}, 429, { 'Retry-After': header }) }, fast),
      (error: unknown) => error instanceof ArcgisError && error.retryAt! > started + 100000)
    assert.equal(calls, 1)
  }
})

test('total deadline during Retry-After does not allow early manual retry', async () => {
  const started = Date.now()
  await assert.rejects(downloadArcgis(signal(), async () => response({}, 429, { 'Retry-After': '1' }),
    { ...fast, totalTimeoutMs: 10 }),
  (error: unknown) => error instanceof ArcgisError && error.retryAt! >= started + 1000)
})

test('Retry-After is honored even on an ArcGIS error wrapped in HTTP 200', async () => {
  let calls = 0
  const started = Date.now()
  await assert.rejects(downloadArcgis(signal(), async () => {
    calls++
    return response({ error: { code: 429 } }, 200, { 'Retry-After': '120' })
  }, fast), (error: unknown) => error instanceof ArcgisError && error.retryAt! >= started + 120000)
  assert.equal(calls, 1)
})

test('invalid JSON and response size limits are not retried', async () => {
  for (const mock of [
    () => new Response('broken JSON'),
    () => response(metadata(), 200, { 'Content-Length': '1000000' }),
    () => response(metadata()),
  ]) {
    let calls = 0
    await assert.rejects(downloadArcgis(signal(), async () => { calls++; return mock() }, { ...fast, maxResponseBytes: 32 }))
    assert.equal(calls, 1)
  }
  const mock = service(1)
  await assert.rejects(downloadArcgis(signal(), mock.fetcher, { ...fast, maxTotalBytes: 32 }), /veľkosť/)
})

test('per-request and total timeout abort hanging fetches without retries', async () => {
  for (const limits of [{ requestTimeoutMs: 10 }, { totalTimeoutMs: 10 }]) {
    let aborted = false
    await assert.rejects(downloadArcgis(signal(), async (_url, init) => {
      init.signal!.addEventListener('abort', () => { aborted = true })
      return new Promise<Response>(() => undefined)
    }, { ...fast, ...limits }), (error: unknown) => error instanceof Error && error.name === 'TimeoutError')
    assert.equal(aborted, true)
  }
})

test('abort before request, during fetch, body read and retry wait stops loading', async () => {
  const before = new AbortController(); before.abort()
  let calls = 0
  await assert.rejects(downloadArcgis(before.signal, async () => { calls++; return response({}) }), { name: 'AbortError' })
  assert.equal(calls, 0)
  for (const phase of ['fetch', 'stream', 'retry']) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10)
    await assert.rejects(downloadArcgis(controller.signal, async () => {
      if (phase === 'fetch') return new Promise<Response>(() => undefined)
      if (phase === 'stream') return new Response(new ReadableStream({ start() { /* TEST_ONLY: stalled body */ } }))
      return response({}, 503, { 'Retry-After': '1' })
    }, fast), { name: 'AbortError' })
    clearTimeout(timer)
  }
})

test('shared load coalesces StrictMode cleanup/remount and caches success only in memory', async () => {
  const mock = service(1)
  let exports = 0
  const shared = createSharedLoad(async (s) => { exports++; return downloadArcgis(s, mock.fetcher, fast) })
  const first = new AbortController()
  const abandoned = shared(first.signal)
  first.abort()
  const second = shared(signal())
  await assert.rejects(abandoned, { name: 'AbortError' })
  const result = await second
  assert.equal(exports, 1)
  assert.equal(mock.urls.length, 6)
  assert.equal(await shared(signal()), result)
  assert.equal(exports, 1)
})

test('shared load aborts after last subscriber leaves and failed loads can retry', async () => {
  let calls = 0
  const shared = createSharedLoad(async () => { calls++; throw new Error('TEST_ONLY failure') })
  await assert.rejects(shared(signal()))
  await assert.rejects(shared(signal()))
  assert.equal(calls, 2)
  let aborted = false
  const pending = createSharedLoad(async (s) => {
    s.addEventListener('abort', () => { aborted = true })
    await delay(1000, s)
    return 1
  })
  const controller = new AbortController()
  const job = pending(controller.signal)
  await Promise.resolve()
  controller.abort()
  await assert.rejects(job, { name: 'AbortError' })
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.equal(aborted, true)
})

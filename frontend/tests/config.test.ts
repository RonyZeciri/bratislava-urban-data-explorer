import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apiUrl, assertLocalArcgis, readFrontendConfig } from '../src/config/parseConfig.ts'
import { gisAvailability, loadForGisMode } from '../src/domain/gisMode.ts'

test('development defaults preserve relative Vite proxy URLs and local GIS', () => {
  const config = readFrontendConfig({}, false)
  assert.equal(config.gisSource, 'local-api')
  assert.equal(apiUrl(config, '/api/health'), '/api/health')
  assert.equal(apiUrl(config, '/api/brownfields'), '/api/brownfields')
  assert.equal(gisAvailability(config.gisSource), null)
})

test('production requires HTTPS backend and defaults to disabled GIS', () => {
  const config = readFrontendConfig({ VITE_API_BASE_URL: 'https://api.example.com/' }, true)
  assert.equal(config.gisSource, 'disabled')
  assert.equal(apiUrl(config, '/api/health'), 'https://api.example.com/api/health')
  assert.equal(apiUrl(config, '/api/brownfields'), 'https://api.example.com/api/brownfields')
  assert.ok(Object.isFrozen(config))
  assert.throws(() => readFrontendConfig({}, true), /VITE_API_BASE_URL/)
})

test('invalid backend URLs fail with a configuration error without echoing secrets', () => {
  for (const base of ['http://api.example.com', '//api.example.com', 'javascript:alert(1)',
    'https://user:TEST_ONLY_PASSWORD@api.example.com', 'https://api.example.com/api',
    'https://api.example.com?token=TEST_ONLY', 'https://api.example.com#x',
    'https://api.example.com\\path', 'https://*.example.com', 'https://api.example.com:0', 'not-a-url']) {
    assert.throws(() => readFrontendConfig({ VITE_API_BASE_URL: base }, true),
      (error: unknown) => error instanceof Error && error.message.includes('VITE_API_BASE_URL') &&
        !error.message.includes('TEST_ONLY'))
  }
  assert.equal(readFrontendConfig({ VITE_API_BASE_URL: 'http://127.0.0.1:8000' }, false).apiBaseUrl,
    'http://127.0.0.1:8000')
})

test('all GIS modes are explicit and unknown or empty values fail', () => {
  for (const gisSource of ['local-api', 'arcgis', 'disabled'] as const) {
    assert.equal(readFrontendConfig({ VITE_GIS_SOURCE: gisSource }, false).gisSource, gisSource)
  }
  for (const value of ['', 'ARCGIS', 'local', ' disabled ', 'false']) {
    assert.throws(() => readFrontendConfig({ VITE_GIS_SOURCE: value }, false), /VITE_GIS_SOURCE/)
  }
})

test('disabled never invokes either GIS loader', async () => {
  let calls = 0
  const loader = async () => { calls++; throw new Error('TEST_ONLY: must never load') }
  for (const source of ['disabled'] as const) {
    const unavailable = gisAvailability(source)!
    assert.equal(unavailable.status, 'disabled')
    await assert.rejects(loadForGisMode(source, loader, loader), { message: unavailable.message })
  }
  assert.equal(calls, 0)
})

test('local mode forwards result and failures without fabricating data', async () => {
  let calls = 0
  const value = await loadForGisMode('local-api', async () => { calls++; return 'TEST_ONLY' }, async () => { throw new Error('wrong source') })
  assert.equal(value, 'TEST_ONLY')
  assert.equal(calls, 1)
  await assert.rejects(loadForGisMode('local-api', async () => { throw new Error('HTTP 503 TEST_ONLY') }, async () => 'wrong'), /HTTP 503/)
})

test('arcgis selects only its own loader and never falls back on failure', async () => {
  const local = async () => { throw new Error('TEST_ONLY: forbidden local fallback') }
  assert.equal(await loadForGisMode('arcgis', local, async () => 'TEST_ONLY arcgis'), 'TEST_ONLY arcgis')
  await assert.rejects(loadForGisMode('arcgis', local, async () => { throw new Error('ArcGIS error') }), /ArcGIS error/)
})

test('public production GIS is locked and ArcGIS runtime is loopback-only', () => {
  for (const source of ['arcgis', 'local-api']) {
    assert.throws(() => readFrontendConfig({ VITE_API_BASE_URL: 'https://api.example.com', VITE_GIS_SOURCE: source }, true), /disabled/)
  }
  const config = readFrontendConfig({ VITE_GIS_SOURCE: 'arcgis' }, false)
  for (const host of ['127.0.0.1', 'localhost', '[::1]']) assert.doesNotThrow(() => assertLocalArcgis(config, host))
  for (const host of ['example.com', 'localhost.evil.test', '192.168.1.10']) assert.throws(() => assertLocalArcgis(config, host), /lokálne/)
})

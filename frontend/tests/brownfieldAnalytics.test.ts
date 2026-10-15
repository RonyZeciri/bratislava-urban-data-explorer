// TEST_ONLY: syntetické objekty iba na jednotkové testy, nie skutočné brownfieldy.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { analyzeBrownfields, summarizeArea, DEFAULT_FILTERS } from '../src/domain/brownfieldAnalytics.ts'
import type { Brownfield } from '../src/api/brownfields.ts'

function fixture(id: number, name: string | null, area: number | null, spec = 100 + id): Brownfield {
  return { type: 'Feature', properties: { OBJECTID: id, SPEC_CISLO: spec, NAZOV: name, VYMERA_HA: area },
    geometry: { type: 'Polygon', coordinates: [[[17, 48], [17.01, 48], [17, 48.01], [17, 48]]] } }
}

const data = [fixture(2, 'TEST Železo', 2), fixture(1, 'TEST Škola', 1.5), fixture(3, 'TEST Alfa', 0), fixture(4, null, null)]
const ids = (features: Brownfield[]) => features.map((feature) => feature.properties.OBJECTID)

test('default keeps all objects, sorts names, does not mutate source', () => {
  const result = analyzeBrownfields(data, DEFAULT_FILTERS)
  assert.deepEqual(ids(result.features), [3, 1, 2, 4])
  assert.deepEqual(ids(data), [2, 1, 3, 4])
  assert.equal(result.totalCount, 4)
})

test('search ignores accents, case and surrounding or repeated whitespace', () => {
  const result = analyzeBrownfields(data, { ...DEFAULT_FILTERS, query: '  TEST   skola  ' })
  assert.deepEqual(ids(result.features), [1])
})

test('numeric query matches exact OBJECTID or SPEC_CISLO, not identifier substrings', () => {
  assert.deepEqual(ids(analyzeBrownfields(data, { ...DEFAULT_FILTERS, query: '103' }).features), [3])
  const rows = [fixture(1, 'TEST 11', 1), fixture(11, 'TEST 1', 2)]
  assert.deepEqual(ids(analyzeBrownfields(rows, { ...DEFAULT_FILTERS, query: '1' }).features), [1])
})

test('area bounds are inclusive and accept decimal comma', () => {
  const result = analyzeBrownfields(data, { ...DEFAULT_FILTERS, minArea: '1,5', maxArea: '1.5' })
  assert.equal(result.valid, true)
  assert.deepEqual(ids(result.features), [1])
})

test('missing areas remain without bounds but are excluded by an active bound', () => {
  assert.equal(analyzeBrownfields(data, DEFAULT_FILTERS).features.length, 4)
  assert.deepEqual(ids(analyzeBrownfields(data, { ...DEFAULT_FILTERS, minArea: '0' }).features), [3, 1, 2])
})

test('invalid and reversed bounds are distinct from a valid empty result', () => {
  for (const filters of [{ minArea: '-1' }, { maxArea: 'abc' }, { minArea: '3', maxArea: '2' }]) {
    const result = analyzeBrownfields(data, { ...DEFAULT_FILTERS, ...filters })
    assert.equal(result.valid, false)
    assert.equal(result.features.length, 0)
    assert.ok(Object.values(result.errors).some(Boolean))
  }
})

test('name and area sorting in both directions keeps unknown values last', () => {
  const expected = { 'name-asc': [3, 1, 2, 4], 'name-desc': [2, 1, 3, 4],
    'area-asc': [3, 1, 2, 4], 'area-desc': [2, 1, 3, 4] }
  for (const sort of ['name-asc', 'name-desc', 'area-asc', 'area-desc'] as const) {
    assert.deepEqual(ids(analyzeBrownfields(data, { ...DEFAULT_FILTERS, sort }).features), expected[sort])
  }
})

test('ties have deterministic OBJECTID ordering', () => {
  const tied = [fixture(2, 'TEST Rovnaké', 1), fixture(1, 'TEST Rovnaké', 1)]
  assert.deepEqual(ids(analyzeBrownfields(tied, { ...DEFAULT_FILTERS, sort: 'area-desc' }).features), [1, 2])
})

test('sum uses source precision, includes zero and reports missing values', () => {
  assert.deepEqual(summarizeArea(data), { sumHa: 3.5, knownCount: 3, missingCount: 1 })
  assert.ok(Math.abs(summarizeArea([fixture(1, 'TEST A', 0.004), fixture(2, 'TEST B', 0.004)]).sumHa! - 0.008) < 1e-12)
})

test('all unknown differs from a valid empty set; invalid numbers are not summed', () => {
  assert.deepEqual(summarizeArea([]), { sumHa: 0, knownCount: 0, missingCount: 0 })
  const missing = [fixture(1, null, null), fixture(2, null, NaN), fixture(3, null, Infinity), fixture(4, null, -1)]
  assert.deepEqual(summarizeArea(missing), { sumHa: null, knownCount: 0, missingCount: 4 })
  delete missing[0].properties.VYMERA_HA
  assert.equal(summarizeArea(missing).missingCount, 4)
})

test('combined query and range statistics use the same result set', () => {
  const result = analyzeBrownfields(data, { ...DEFAULT_FILTERS, query: 'test', minArea: '1', maxArea: '1.9' })
  assert.deepEqual(ids(result.features), [1])
  assert.equal(result.filteredArea.sumHa, 1.5)
  assert.equal(result.totalArea.sumHa, 3.5)
})

test('zero matches has a valid zero sum; defaults restore all results', () => {
  const result = analyzeBrownfields(data, { ...DEFAULT_FILTERS, query: 'TEST_ONLY_NO_MATCH' })
  assert.equal(result.valid, true)
  assert.equal(result.features.length, 0)
  assert.equal(result.filteredArea.sumHa, 0)
  assert.equal(analyzeBrownfields(data, { ...DEFAULT_FILTERS }).features.length, data.length)
})

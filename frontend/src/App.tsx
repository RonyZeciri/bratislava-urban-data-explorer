import { useMemo, useState } from 'react'
import { AnalyticsPanel } from './components/AnalyticsPanel'
import { analyzeBrownfields, DEFAULT_FILTERS } from './domain/brownfieldAnalytics'
import type { BrownfieldFilters } from './domain/brownfieldAnalytics'
import { BackendStatus } from './components/BackendStatus'
import { BrownfieldsLayer } from './components/BrownfieldsLayer'
import type { FocusRequest } from './components/BrownfieldsLayer'
import { useBrownfields } from './hooks/useBrownfields'
import { BrownfieldPanel } from './components/BrownfieldPanel'
import { CityMap } from './components/CityMap'
import './App.css'

function App() {
  const { state, retry } = useBrownfields()
  const [filters, setFilters] = useState<BrownfieldFilters>({ ...DEFAULT_FILTERS })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)
  const analysis = useMemo(() => analyzeBrownfields(
    state.status === 'ready' ? state.data.features : [], filters,
  ), [state, filters])
  const visibleData = useMemo(() => ({ type: 'FeatureCollection' as const, features: analysis.features }), [analysis])
  // React Leaflet nemení GeoJSON dáta za behu. Obnovujeme iba vrstvu, nie mapu.
  const layerKey = `${state.status === 'ready' ? state.acquiredAt ?? 'local' : ''}:${analysis.features.map((feature) => feature.properties.OBJECTID).sort((a, b) => a - b).join(',')}`
  const selected = analysis.features.find((feature) => feature.properties.OBJECTID === selectedId) ?? null

  function changeFilters(next: BrownfieldFilters) {
    const result = analyzeBrownfields(state.status === 'ready' ? state.data.features : [], next)
    setFilters(next)
    setFocusRequest(null)
    setSelectedId((id) => result.features.some((feature) => feature.properties.OBJECTID === id) ? id : null)
  }

  return (
    <main className="page">
      <header className="project-header">
        <div className="project-brand">
          <span className="project-mark" aria-hidden="true">BA<span> / </span></span>
          <div>
            <p className="brand-name">Urban Data Explorer</p>
            <p className="brand-caption">Bratislava · osobný programátorský projekt</p>
          </div>
        </div>
        <BackendStatus />
      </header>

      <section className="intro" aria-labelledby="project-title">
        <div>
          <p className="eyebrow">Mesto · dáta · súvislosti</p>
          <h1 id="project-title">Bratislava Urban Data Explorer</h1>
          <p className="lead">Objavuj mesto. Rozumej jeho premene.</p>
        </div>
        <p className="description">
          Interaktívny priestor na skúmanie Bratislavy. Postupne prepájame mapu
          s verejnými mestskými dátami, aby boli zmeny v území zrozumiteľnejšie.
        </p>
      </section>

      <AnalyticsPanel filters={filters} analysis={analysis} ready={state.status === 'ready'} onChange={changeFilters} />

      <div className="explorer-layout">
        <CityMap>
          {state.status === 'ready' && (
            <BrownfieldsLayer key={layerKey} data={visibleData} selectedId={selected?.properties.OBJECTID ?? null}
              onSelect={setSelectedId} focusRequest={focusRequest} />
          )}
        </CityMap>
        <BrownfieldPanel state={state} results={analysis.features} filtersValid={analysis.valid}
          onRetry={() => { setSelectedId(null); setFocusRequest(null); retry() }}
          selected={selected} onSelect={setSelectedId}
          onZoom={() => {
            if (selected) setFocusRequest({ feature: selected, sequence: (focusRequest?.sequence ?? 0) + 1 })
          }} />
      </div>

      <footer>
        <span>Nezávislý vzdelávací a portfóliový projekt. Nie je oficiálnou aplikáciou MIB.</span>
        <span>React + TypeScript · FastAPI · Leaflet</span>
      </footer>
    </main>
  )
}

export default App

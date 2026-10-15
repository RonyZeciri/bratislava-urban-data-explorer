import { useState } from 'react'
import { BackendStatus } from './components/BackendStatus'
import { BrownfieldsLayer } from './components/BrownfieldsLayer'
import type { FocusRequest } from './components/BrownfieldsLayer'
import { useBrownfields } from './hooks/useBrownfields'
import { BrownfieldPanel } from './components/BrownfieldPanel'
import { CityMap } from './components/CityMap'
import './App.css'

function App() {
  const state = useBrownfields()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)
  const selected = state.status === 'ready'
    ? state.data.features.find((feature) => feature.properties.OBJECTID === selectedId) ?? null
    : null

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

      <div className="explorer-layout">
        <CityMap>
          {state.status === 'ready' && (
            <BrownfieldsLayer data={state.data} selectedId={selectedId}
              onSelect={setSelectedId} focusRequest={focusRequest} />
          )}
        </CityMap>
        <BrownfieldPanel state={state} selected={selected} onSelect={setSelectedId}
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

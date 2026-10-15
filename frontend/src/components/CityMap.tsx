import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './CityMap.css'

const BRATISLAVA_CENTER: [number, number] = [48.1486, 17.1077]
const INITIAL_ZOOM = 13

type CityMapProps = {
  // Budúce overené vrstvy, napríklad <GeoJSON data={...} />, patria sem.
  children?: ReactNode
}

function MapTools() {
  const map = useMap()

  useEffect(() => {
    // Leaflet potrebuje vedieť aj o zmene veľkosti svojho rodičovského panelu.
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }))
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])

  return (
    <button
      className="map-reset"
      type="button"
      onClick={() => map.setView(BRATISLAVA_CENTER, INITIAL_ZOOM, { animate: true })}
    >
      Späť na Bratislavu
    </button>
  )
}

export function CityMap({ children }: CityMapProps) {
  const [tileStatus, setTileStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  return (
    <section className="city-map" aria-labelledby="map-title">
      <div className="map-heading">
        <div>
          <p className="eyebrow">Priestorové súvislosti</p>
          <h2 id="map-title">Mapa Bratislavy</h2>
        </div>
        <span className="map-source">Podklad OpenStreetMap</span>
      </div>

      <MapContainer
        className="map-canvas"
        center={BRATISLAVA_CENTER}
        zoom={INITIAL_ZOOM}
        minZoom={3}
        maxZoom={19}
        zoomControl={false}
        zoomSnap={0.5}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={100}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
          keepBuffer={0}
          eventHandlers={{
            loading: () => setTileStatus('loading'),
            load: () => setTileStatus((current) => current === 'error' ? 'error' : 'ready'),
            tileerror: () => setTileStatus('error'),
          }}
        />
        <ZoomControl position="topleft" zoomInTitle="Priblížiť" zoomOutTitle="Oddialiť" />
        <MapTools />
        {children}
      </MapContainer>

      <div className="map-caption">
        <p>Posúvaj mapu ťahaním. Približuj tlačidlami + / −, kolieskom alebo gestom dvoch prstov.</p>
        <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer noopener">
          Nahlásiť chybu v mape ↗
        </a>
      </div>
      <p className={`tile-status tile-status--${tileStatus}`} role="status">
        {tileStatus === 'loading' && 'Načítava sa mapový podklad…'}
        {tileStatus === 'ready' && 'Mapový podklad OpenStreetMap načítaný.'}
        {tileStatus === 'error' && 'Časť mapového podkladu sa nepodarilo načítať. Skontroluj internetové pripojenie a obnov stránku.'}
      </p>
    </section>
  )
}

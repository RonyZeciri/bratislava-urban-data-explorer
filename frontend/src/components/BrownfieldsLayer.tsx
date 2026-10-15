import { useEffect, useRef } from 'react'
import { GeoJSON, useMap } from 'react-leaflet'
import { geoJSON } from 'leaflet'
import type { GeoJSON as LeafletGeoJSON, Path } from 'leaflet'
import type { Brownfield, BrownfieldsCollection } from '../api/brownfields'

export type FocusRequest = { feature: Brownfield; sequence: number }

type Props = {
  data: BrownfieldsCollection
  selectedId: number | null
  onSelect: (id: number) => void
  focusRequest: FocusRequest | null
}

export function BrownfieldsLayer({ data, selectedId, onSelect, focusRequest }: Props) {
  const map = useMap()
  const layerRef = useRef<LeafletGeoJSON>(null)

  useEffect(() => {
    if (focusRequest) {
      map.fitBounds(geoJSON(focusRequest.feature).getBounds(), {
        padding: [28, 28], maxZoom: 17,
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      })
    }
  }, [map, focusRequest])

  useEffect(() => {
    layerRef.current?.eachLayer((layer) => {
      const path = layer as Path & { feature: Brownfield }
      const selected = path.feature.properties.OBJECTID === selectedId
      path.getElement()?.setAttribute('aria-pressed', String(selected))
      if (selected) path.bringToFront()
    })
  }, [selectedId, data])

  return (
    <GeoJSON
      ref={layerRef}
      data={data}
      style={(feature) => {
        const selected = feature?.properties.OBJECTID === selectedId
        return {
          color: selected ? '#8b351c' : '#185f4d',
          fillColor: selected ? '#f49a45' : '#439979',
          fillOpacity: selected ? 0.75 : 0.4,
          weight: selected ? 4 : 2,
        }
      }}
      onEachFeature={(feature, layer) => {
        const properties = feature.properties as Brownfield['properties']
        const select = () => onSelect(properties.OBJECTID)
        layer.on('click', select)
        layer.on('add', () => {
          const element = (layer as Path).getElement()
          if (!element) return
          element.setAttribute('tabindex', '0')
          element.setAttribute('role', 'button')
          element.setAttribute('aria-label', `Vybrať lokalitu: ${properties.NAZOV || 'Neuvedené'} (${properties.SPEC_CISLO ?? properties.OBJECTID})`)
          element.addEventListener('keydown', (event) => {
            const key = (event as KeyboardEvent).key
            if (key === 'Enter' || key === ' ') {
              event.preventDefault()
              event.stopPropagation()
              select()
            }
          })
        })
      }}
    />
  )
}

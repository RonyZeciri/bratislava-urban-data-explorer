import { BROWNFIELDS_SOURCE_URL } from '../api/brownfields'
import type { Brownfield } from '../api/brownfields'
import type { BrownfieldsState } from '../hooks/useBrownfields'

type Props = {
  state: BrownfieldsState
  selected: Brownfield | null
  onSelect: (id: number | null) => void
  onZoom: () => void
}

function display(value: string | number | null | undefined): string {
  return value == null || (typeof value === 'string' && !value.trim())
    ? 'Neuvedené' : String(value)
}

export function BrownfieldPanel({ state, selected, onSelect, onZoom }: Props) {
  const properties = selected?.properties
  const details = properties ? [
    ['Evidenčné číslo', display(properties.SPEC_CISLO)],
    ['Mestská časť', display(properties.MC)],
    ['Adresa', display(properties.ADRESA)],
    ['Výmera (ha)', properties.VYMERA_HA == null ? 'Neuvedené' :
      new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 2 }).format(properties.VYMERA_HA)],
    ['Pôvodné využitie', display(properties.PR_VYU_POP)],
    ['Funkčné využitie podľa ÚPN v zdroji', display(properties.N_FUNK_POP)],
    ['Známe zámery v zdroji', display(properties.ZAMER)],
    ['Environmentálna záťaž v zdroji', display(properties.SEZ_POPIS)],
  ] : []

  return (
    <aside className="brownfield-panel" aria-labelledby="brownfields-title">
      <div className="panel-heading">
        <p className="eyebrow">Dátová edícia 2022</p>
        <h2 id="brownfields-title">Brownfieldy</h2>
      </div>

      <div className="dataset-source">
        <a href={BROWNFIELDS_SOURCE_URL} target="_blank" rel="noopener noreferrer">
          Zdroj: MIB / ArcGIS, evidencia brownfieldov 2022
        </a>
        <p>Údaje edície 2022 nepredstavujú overenie aktuálneho stavu lokalít.</p>
      </div>

      <div className="data-status" role="status">
        {state.status === 'loading' && <p>Načítavajú sa údaje o brownfieldoch…</p>}
        {state.status === 'error' && <p className="data-error">{state.message} Po obnovení pripojenia obnov stránku.</p>}
        {state.status === 'ready' && <p>Načítané lokality: <strong>{state.data.features.length}</strong></p>}
        {state.status === 'ready' && state.data.features.length === 0 &&
          <p>Overená snímka neobsahuje žiadne lokality.</p>}
      </div>

      {state.status === 'ready' && state.data.features.length > 0 && (
        <div className="locality-picker">
          <label htmlFor="locality-select">Vybrať lokalitu</label>
          <select
            id="locality-select"
            value={properties?.OBJECTID ?? ''}
            onChange={(event) => onSelect(event.target.value === '' ? null : Number(event.target.value))}
          >
            <option value="">Vyber na mape alebo zo zoznamu</option>
            {[...state.data.features].sort((a, b) =>
              (a.properties.NAZOV ?? '').localeCompare(b.properties.NAZOV ?? '', 'sk'),
            ).map((feature) => (
              <option key={feature.properties.OBJECTID} value={feature.properties.OBJECTID}>
                {display(feature.properties.NAZOV)} · {display(feature.properties.SPEC_CISLO)}
              </option>
            ))}
          </select>
        </div>
      )}

      {properties ? (
        <div className="locality-detail" aria-live="polite">
          <h3>{display(properties.NAZOV)}</h3>
          <div className="detail-actions">
            <button type="button" className="primary-button" onClick={onZoom}>Priblížiť lokalitu</button>
            <button type="button" className="secondary-button" onClick={() => onSelect(null)}>Zrušiť výber</button>
          </div>
          <dl className="locality-attributes">
            {details.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </div>
      ) : state.status === 'ready' && state.data.features.length > 0 ? (
        <div className="empty-state">
          <span className="empty-state-symbol" aria-hidden="true">↗</span>
          <h3>Vyber lokalitu</h3>
          <p>Klikni na zelený polygón alebo vyber názov zo zoznamu. Tu sa zobrazia údaje evidované v zdroji.</p>
        </div>
      ) : null}


    </aside>
  )
}

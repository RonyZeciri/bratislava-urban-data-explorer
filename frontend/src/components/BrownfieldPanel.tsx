import { BROWNFIELDS_SOURCE_URL } from '../api/brownfields'
import type { Brownfield } from '../api/brownfields'
import type { BrownfieldsState } from '../hooks/useBrownfields'
import { MIB_EXPERIENCE_URL } from '../domain/gisMode'
import { RetryButton } from './RetryButton'

type Props = {
  state: BrownfieldsState
  results: Brownfield[]
  filtersValid: boolean
  selected: Brownfield | null
  onSelect: (id: number | null) => void
  onZoom: () => void
  onRetry: () => void
}

function display(value: string | number | null | undefined): string {
  return value == null || (typeof value === 'string' && !value.trim())
    ? 'Neuvedené' : String(value)
}

export function BrownfieldPanel({ state, results, filtersValid, selected, onSelect, onZoom, onRetry }: Props) {
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
        {state.status === 'ready' && <p>{state.source === 'arcgis'
          ? <>Získané priamo z ArcGIS: <time dateTime={state.acquiredAt}>{new Date(state.acquiredAt).toLocaleString('sk-SK')}</time>. Iba lokálne technické overenie.</>
          : 'Použitá je validovaná lokálna snímka; dátum jej stiahnutia je v lokálnom manifeste.'}</p>}
      </div>

      <div className="data-status" role="status">
        {state.status === 'disabled' && (
          <div><p>{state.message}</p><a href={MIB_EXPERIENCE_URL} target="_blank" rel="noopener noreferrer">Oficiálna ArcGIS aplikácia MIB – brownfieldy ↗</a></div>
        )}
        {state.status === 'loading' && <p>Načítavajú sa údaje o brownfieldoch…</p>}
        {state.status === 'error' && <div>
          <p className="data-error">{state.message} Neúplné dáta sa nezobrazujú.</p>
          <RetryButton retryAt={state.retryAt} onRetry={onRetry} />
          <a href={MIB_EXPERIENCE_URL} target="_blank" rel="noopener noreferrer">Oficiálna ArcGIS aplikácia MIB – brownfieldy ↗</a>
        </div>}
        {state.status === 'ready' && <p>Vo výsledkoch: <strong>{filtersValid ? results.length : '—'}</strong> z {state.data.features.length} lokalít</p>}
        {state.status === 'ready' && state.data.features.length === 0 &&
          <p>Overená snímka neobsahuje žiadne lokality.</p>}
        {state.status === 'ready' && !filtersValid && <p>Oprav neplatné hranice výmery v analytickom paneli.</p>}
        {state.status === 'ready' && filtersValid && state.data.features.length > 0 && results.length === 0 &&
          <p>Žiadna lokalita nevyhovuje filtrom. Uprav vyhľadávanie alebo použi „Resetovať filtre“.</p>}
      </div>

      {state.status === 'ready' && filtersValid && results.length > 0 && (
        <div className="locality-picker">
          <label htmlFor="locality-select">Vybrať lokalitu</label>
          <select
            id="locality-select"
            value={properties?.OBJECTID ?? ''}
            onChange={(event) => onSelect(event.target.value === '' ? null : Number(event.target.value))}
          >
            <option value="">Vyber na mape alebo zo zoznamu</option>
            {results.map((feature) => (
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
      ) : state.status === 'ready' && filtersValid && results.length > 0 ? (
        <div className="empty-state">
          <span className="empty-state-symbol" aria-hidden="true">↗</span>
          <h3>Vyber lokalitu</h3>
          <p>Klikni na zelený polygón alebo vyber názov zo zoznamu. Tu sa zobrazia údaje evidované v zdroji.</p>
        </div>
      ) : null}


    </aside>
  )
}

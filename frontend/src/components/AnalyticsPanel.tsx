import type { BrownfieldAnalysis, BrownfieldFilters, SortOrder, AreaSummary } from '../domain/brownfieldAnalytics'
import { DEFAULT_FILTERS } from '../domain/brownfieldAnalytics'
import './AnalyticsPanel.css'

type Props = {
  filters: BrownfieldFilters
  analysis: BrownfieldAnalysis
  ready: boolean
  onChange: (filters: BrownfieldFilters) => void
}

const numberFormat = new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 2 })

function AreaMetric({ title, summary, available }: { title: string; summary: AreaSummary; available: boolean }) {
  return (
    <div className="metric">
      <dt>{title}</dt>
      <dd>{available ? summary.sumHa === null ? 'Neuvedené' : numberFormat.format(summary.sumHa) : '—'} {available && summary.sumHa !== null && <span>ha</span>}</dd>
      <dd className="metric-note">{available ? `${summary.knownCount} so známou výmerou · ${summary.missingCount} bez platnej výmery` : 'Čaká na platné údaje a filtre'}</dd>
    </div>
  )
}

export function AnalyticsPanel({ filters, analysis, ready, onChange }: Props) {
  return (
    <section className="analytics-panel" aria-labelledby="analytics-title">
      <div className="analytics-heading">
        <div><p className="eyebrow">Historická evidencia 2022 · MIB / ArcGIS</p><h2 id="analytics-title">Prehľad lokalít</h2></div>
        <p>Vyhľadávanie a výpočty nad načítanou snímkou vrstvy 8.</p>
      </div>

      <dl className="metrics" aria-live="polite" aria-atomic="true">
        <div className="metric"><dt>Všetky lokality</dt><dd>{ready ? analysis.totalCount : '—'}</dd><dd className="metric-note">Počet prvkov v načítanej snímke</dd></div>
        <div className="metric"><dt>Vyhovuje filtrom</dt><dd>{ready && analysis.valid ? analysis.features.length : '—'}</dd><dd className="metric-note">Počet výsledkov v zozname aj na mape</dd></div>
        <AreaMetric title="Súčet výmer všetkých lokalít" summary={analysis.totalArea} available={ready} />
        <AreaMetric title="Súčet výmer výsledkov" summary={analysis.filteredArea} available={ready && analysis.valid} />
      </dl>

      <form onSubmit={(event) => event.preventDefault()}>
        <fieldset disabled={!ready} className="analytics-filters">
          <legend>Vyhľadávanie a filtre</legend>
          <div className="filter-search">
            <label htmlFor="brownfield-search">Názov alebo identifikátor</label>
            <input id="brownfield-search" type="search" value={filters.query}
              placeholder="Napr. Školská alebo 37" aria-describedby="search-help"
              onChange={(event) => onChange({ ...filters, query: event.target.value })} />
          </div>
          <div>
            <label htmlFor="min-area">Výmera od (ha)</label>
            <input id="min-area" type="text" inputMode="decimal" value={filters.minArea}
              placeholder="Bez minima" aria-invalid={Boolean(analysis.errors.minArea || analysis.errors.range)}
              aria-describedby="area-help filter-errors"
              onChange={(event) => onChange({ ...filters, minArea: event.target.value })} />
          </div>
          <div>
            <label htmlFor="max-area">Výmera do (ha)</label>
            <input id="max-area" type="text" inputMode="decimal" value={filters.maxArea}
              placeholder="Bez maxima" aria-invalid={Boolean(analysis.errors.maxArea || analysis.errors.range)}
              aria-describedby="area-help filter-errors"
              onChange={(event) => onChange({ ...filters, maxArea: event.target.value })} />
          </div>
          <div>
            <label htmlFor="brownfield-sort">Zoradiť lokality</label>
            <select id="brownfield-sort" value={filters.sort}
              onChange={(event) => onChange({ ...filters, sort: event.target.value as SortOrder })}>
              <option value="name-asc">Názov A → Z</option>
              <option value="name-desc">Názov Z → A</option>
              <option value="area-desc">Výmera: najväčšie prvé</option>
              <option value="area-asc">Výmera: najmenšie prvé</option>
            </select>
          </div>
          <button type="button" className="reset-filters" onClick={() => onChange({ ...DEFAULT_FILTERS })}>Resetovať filtre</button>
        </fieldset>
        <p id="search-help" className="filter-help">Názov hľadáme aj bez diakritiky. Číselný dopyt presne porovnávame s evidenčným číslom SPEC_CISLO alebo OBJECTID.</p>
        <p id="area-help" className="filter-help">Hranice výmery sú vrátane. Bez hraníc zostávajú aj lokality bez výmery; s hranicou vyžadujeme známu výmeru. Použi čiarku alebo bodku.</p>
        <div id="filter-errors" role="alert" className="filter-errors">
          {ready && Object.values(analysis.errors).filter(Boolean).map((error) => <p key={error}>{error}</p>)}
        </div>
      </form>

      <details className="analytics-methodology">
        <summary>Ako sa štatistiky počítajú</summary>
        <p>Počet všetkých je počet GeoJSON prvkov načítanej vrstvy 8; počet výsledkov je počet po vyhľadávaní a filtrovaní. Triedenie počty nemení.</p>
        <p>Výmera je súčet konečných nezáporných čísel z poľa VYMERA_HA, samostatne za všetky lokality a výsledky. Sčítavame pôvodné hodnoty a až zobrazenie zaokrúhľujeme na dve desatinné miesta. Chýbajúce a neplatné hodnoty vynecháme zo súčtu a uvedieme ich počet; všetky chýbajúce znamenajú „Neuvedené“. Prázdny výber má súčet 0 ha.</p>
        <p>Ide o súčet evidovaných atribútov z roku 2022, nie geometrické zjednotenie plôch ani výmeru transformačných území. Prípadné prekryvy neodpočítavame. Neplatné hranice filtrov označíme a výsledkové štatistiky nezobrazíme.</p>
      </details>
    </section>
  )
}

export type GisSource = 'local-api' | 'arcgis' | 'disabled'
export type FrontendConfig = Readonly<{ apiBaseUrl: string; gisSource: GisSource }>
type Environment = Readonly<{ VITE_API_BASE_URL?: string; VITE_GIS_SOURCE?: string }>

/** Čistá funkcia zdieľaná Vite buildom, prehliadačom a testami. */
export function readFrontendConfig(env: Environment, production: boolean): FrontendConfig {
  const base = env.VITE_API_BASE_URL?.trim() ?? ''
  let apiBaseUrl = ''
  if (base) {
    let url: URL
    try { url = new URL(base) } catch { throw new Error('Konfigurácia VITE_API_BASE_URL: očakáva sa absolútna URL backendu.') }
    if (!['http:', 'https:'].includes(url.protocol) || (production && url.protocol !== 'https:') ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash || /[\\\s?#*]/.test(base) || url.port === '0') {
      throw new Error('Konfigurácia VITE_API_BASE_URL: použi origin backendu bez cesty, hesla a query; v produkcii iba HTTPS.')
    }
    apiBaseUrl = url.origin
  } else if (production) {
    throw new Error('Konfigurácia VITE_API_BASE_URL: v produkcii je povinná HTTPS adresa backendu.')
  }
  const gisSource = env.VITE_GIS_SOURCE ?? (production ? 'disabled' : 'local-api')
  if (gisSource !== 'local-api' && gisSource !== 'arcgis' && gisSource !== 'disabled') {
    throw new Error('Konfigurácia VITE_GIS_SOURCE: povolené sú local-api, arcgis a disabled.')
  }
  if (production && gisSource !== 'disabled') {
    throw new Error('Produkčné GIS musí zostať disabled, kým nie sú vyjasnené podmienky použitia dát.')
  }
  return Object.freeze({ apiBaseUrl, gisSource })
}

export function assertLocalArcgis(config: FrontendConfig, hostname: string): void {
  if (config.gisSource === 'arcgis' && !['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
    throw new Error('Režim arcgis je povolený iba na lokálne technické overenie (localhost).')
  }
}

export function apiUrl(config: FrontendConfig, path: '/api/health' | '/api/brownfields'): string {
  return `${config.apiBaseUrl}${path}`
}

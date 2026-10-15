export type HealthResponse = {
  status: 'ok'
}

/** Relatívnu adresu /api počas vývoja presmeruje Vite na FastAPI. */
export async function getHealth(signal: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/health', { signal })

  if (!response.ok) {
    throw new Error(`Kontrola backendu zlyhala: HTTP ${response.status}`)
  }

  // TypeScript nekontroluje dáta zo siete, preto overíme aj obsah JSON.
  const data: unknown = await response.json()

  if (
    typeof data !== 'object' ||
    data === null ||
    !('status' in data) ||
    data.status !== 'ok'
  ) {
    throw new Error('Backend vrátil neočakávanú odpoveď.')
  }

  return { status: data.status }
}

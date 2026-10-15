import { useEffect, useState } from 'react'
import { getBrownfieldsResult } from '../api/brownfields'
import type { BrownfieldsResult } from '../api/brownfields'
import { ArcgisError } from '../api/arcgis'
import { config } from '../config'
import { gisAvailability } from '../domain/gisMode'

export type BrownfieldsState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retryAt?: number }
  | { status: 'disabled'; message: string }
  | ({ status: 'ready' } & BrownfieldsResult)

export function useBrownfields() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<BrownfieldsState>(() => gisAvailability(config.gisSource) ?? { status: 'loading' })

  useEffect(() => {
    if (gisAvailability(config.gisSource)) return
    let active = true
    const controller = new AbortController()
    // ArcGIS má vlastný celkový/per-request limit; cleanup stále ruší odber.
    const timeout = config.gisSource === 'local-api' ? window.setTimeout(() => controller.abort(), 15000) : undefined
    void getBrownfieldsResult(controller.signal).then(
      (result) => { if (active) setState({ status: 'ready', ...result }) },
      (error: unknown) => {
        if (active) setState({
          status: 'error',
          retryAt: error instanceof ArcgisError ? error.retryAt : undefined,
          message: controller.signal.aborted || (error instanceof Error && error.name === 'TimeoutError') ? 'Načítanie údajov prekročilo časový limit.' :
            error instanceof Error ? error.message : 'Údaje sa nepodarilo načítať.',
        })
      },
    ).finally(() => window.clearTimeout(timeout))
    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [attempt])

  return { state, retry: () => {
    if (state.status === 'error' && (!state.retryAt || Date.now() >= state.retryAt)) {
      setState({ status: 'loading' })
      setAttempt((value) => value + 1)
    }
  } }
}

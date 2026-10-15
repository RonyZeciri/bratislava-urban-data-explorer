import { useEffect, useState } from 'react'
import { getBrownfields } from '../api/brownfields'
import type { BrownfieldsCollection } from '../api/brownfields'

export type BrownfieldsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: BrownfieldsCollection }

export function useBrownfields(): BrownfieldsState {
  const [state, setState] = useState<BrownfieldsState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    void getBrownfields(controller.signal).then(
      (data) => { if (active) setState({ status: 'ready', data }) },
      (error: unknown) => {
        if (active) setState({
          status: 'error',
          message: controller.signal.aborted ? 'Načítanie údajov prekročilo časový limit.' :
            error instanceof Error ? error.message : 'Údaje sa nepodarilo načítať.',
        })
      },
    ).finally(() => window.clearTimeout(timeout))
    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [])

  return state
}

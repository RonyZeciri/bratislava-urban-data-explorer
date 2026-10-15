import { useEffect, useState } from 'react'
import { getHealth } from '../api/health'

type ConnectionStatus = 'connecting' | 'connected' | 'unavailable'

const connectionLabels: Record<ConnectionStatus, string> = {
  connecting: 'Pripája sa',
  connected: 'Pripojené',
  unavailable: 'Nedostupné',
}

export function BackendStatus() {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('connecting')

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const timeout = window.setTimeout(() => controller.abort(), 5000)

    async function checkConnection() {
      try {
        await getHealth(controller.signal)
        if (active) setConnectionStatus('connected')
      } catch {
        if (active) setConnectionStatus('unavailable')
      } finally {
        window.clearTimeout(timeout)
      }
    }

    void checkConnection()

    return () => {
      active = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  return (
    <p className={`connection-status connection-status--${connectionStatus}`} role="status">
      <span className="status-dot" aria-hidden="true" />
      Backend: <strong>{connectionLabels[connectionStatus]}</strong>
    </p>
  )
}

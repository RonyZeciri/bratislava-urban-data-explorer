import { useEffect, useState } from 'react'

export function RetryButton({ retryAt = 0, onRetry }: { retryAt?: number; onRetry: () => void }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (retryAt <= Date.now()) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [retryAt, now])
  const blocked = now < retryAt
  return <div className="detail-actions">
    <button type="button" className="secondary-button" disabled={blocked} onClick={onRetry}>Opakovať</button>
    {blocked && <p role="status">Služba dočasne obmedzila opakovanie požiadaviek. Počkajte, prosím.</p>}
  </div>
}

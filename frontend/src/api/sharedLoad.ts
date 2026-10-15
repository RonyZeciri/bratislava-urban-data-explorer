import { abortable } from './abort.ts'

/** Jedna úloha a posledný úspešný výsledok iba v pamäti tejto stránky. */
export function createSharedLoad<T>(loader: (signal: AbortSignal) => Promise<T>) {
  type Flight = { controller: AbortController; promise: Promise<T>; users: number; timer?: ReturnType<typeof setTimeout> }
  let current: Flight | undefined
  let cached: { value: T } | undefined
  return (signal: AbortSignal): Promise<T> => {
    signal.throwIfAborted()
    if (cached) return Promise.resolve(cached.value)
    if (!current || current.controller.signal.aborted) {
      const controller = new AbortController()
      const flight: Flight = { controller, users: 0, promise: Promise.resolve().then(() => loader(controller.signal)) }
      flight.promise = flight.promise.then((value) => {
        controller.signal.throwIfAborted()
        cached = { value }
        return value
      }).finally(() => { if (current === flight) current = undefined })
      current = flight
    }
    const flight = current
    clearTimeout(flight.timer)
    flight.users++
    return abortable(flight.promise, signal).finally(() => {
      flight.users--
      if (flight.users === 0 && current === flight) {
        // StrictMode cleanup + okamžité pripojenie zdieľajú pôvodný export.
        flight.timer = setTimeout(() => { if (flight.users === 0) flight.controller.abort() }, 0)
      }
    })
  }
}

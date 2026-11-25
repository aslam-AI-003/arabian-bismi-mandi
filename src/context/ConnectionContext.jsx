import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { pingDatabase } from '../lib/supabase'

// Billing actions are enabled only after a real round trip to the database
// succeeds. navigator.onLine alone is not trusted (Wi-Fi without internet).
const ConnectionContext = createContext({ status: 'checking', online: true, verify: async () => true })

const HEARTBEAT_MS = 20000
const TIMEOUT_MS = 8000

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

export function ConnectionProvider({ children }) {
  const [status, setStatus] = useState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'checking')
  const inflight = useRef(null)

  const verify = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus('offline')
      return false
    }
    if (inflight.current) return inflight.current
    inflight.current = (async () => {
      try {
        await withTimeout(pingDatabase(), TIMEOUT_MS)
        setStatus('online')
        return true
      } catch {
        setStatus('offline')
        return false
      } finally {
        inflight.current = null
      }
    })()
    return inflight.current
  }, [])

  useEffect(() => {
    verify()
    const onOnline = () => { setStatus('checking'); verify() }
    const onOffline = () => setStatus('offline')
    const onVisible = () => { if (document.visibilityState === 'visible') verify() }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(verify, HEARTBEAT_MS)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [verify])

  // "checking" counts as online so buttons don't flicker on page load; the
  // database still rejects writes that can't reach it.
  return (
    <ConnectionContext.Provider value={{ status, online: status !== 'offline', verify }}>
      {children}
    </ConnectionContext.Provider>
  )
}

export const useConnection = () => useContext(ConnectionContext)

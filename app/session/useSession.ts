import { useEffect, useState } from 'react'
import type { SessionSettings } from './types'

export async function fetchSession(): Promise<SessionSettings> {
  const response = await fetch('/api/settings', { credentials: 'same-origin' })
  if (!response.ok) {
    throw new Error(`GET /api/settings failed: ${response.status}`)
  }
  return (await response.json()) as SessionSettings
}

export interface UseSessionResult {
  status: 'loading' | 'success' | 'error'
  data: SessionSettings | undefined
  error: Error | undefined
}

export function useSession(): UseSessionResult {
  const [status, setStatus] = useState<UseSessionResult['status']>('loading')
  const [data, setData] = useState<SessionSettings | undefined>(undefined)
  const [error, setError] = useState<Error | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    fetchSession()
      .then((settings) => {
        if (cancelled) return
        setData(settings)
        setStatus('success')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error(String(err)))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { status, data, error }
}

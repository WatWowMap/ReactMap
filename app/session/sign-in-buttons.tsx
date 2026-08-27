/**
 * The way into the app, and the way out.
 *
 * Which providers appear comes from the server, not from a list here. An
 * instance running only local auth must not show a Discord button, and one
 * that needs Discord must not hide it, and the client cannot know which it
 * is looking at.
 *
 * A failure shows its reason rather than leaving a button that appears to do
 * nothing. Sign-in navigates away on success, so the only thing a person can
 * see here is the failure.
 */

import { useState } from 'react'
import { Button } from '../components/ui/button'
import type { Navigate } from './sign-in'
import { providerLabel, signInWith, signOut } from './sign-in'

export interface SignInButtonsProps {
  methods: string[]
  /** Where the provider returns someone after the round trip. */
  callbackURL?: string
  /** Test seam. Real navigation when absent. */
  navigate?: Navigate
}

export function SignInButtons({
  methods,
  callbackURL,
  navigate,
}: SignInButtonsProps) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  if (methods.length === 0) {
    return (
      <p className="mt-2 text-muted-foreground">
        This map has no sign-in configured.
      </p>
    )
  }

  async function start(provider: string) {
    setError(null)
    setBusy(provider)
    try {
      await signInWith(provider, {
        ...(navigate ? { navigate } : {}),
        ...(callbackURL ? { callbackURL } : {}),
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
      setBusy(null)
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {methods.map((method) => (
          <Button
            key={method}
            onClick={() => void start(method)}
            disabled={busy !== null}
          >
            {busy === method
              ? `Signing in with ${providerLabel(method)}...`
              : `Sign in with ${providerLabel(method)}`}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export interface SignOutButtonProps {
  /** Test seam. Real navigation when absent. */
  navigate?: Navigate
}

export function SignOutButton({ navigate }: SignOutButtonProps) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function end() {
    setError(null)
    setBusy(true)
    try {
      await signOut(navigate ? { navigate } : {})
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <Button variant="outline" onClick={() => void end()} disabled={busy}>
        {busy ? 'Signing out...' : 'Sign out'}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

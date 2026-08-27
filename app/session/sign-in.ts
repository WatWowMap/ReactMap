/**
 * Starting and ending a session.
 *
 * Better Auth answers a social sign-in with a URL rather than a redirect, so
 * the browser has to be sent there deliberately. That is the whole reason
 * this file exists: without it there is no way into the app at all, and the
 * profile page's "Sign in to see your profile" has nothing behind it.
 *
 * Both calls take the navigation as a parameter so a test can observe where
 * the browser was sent without a real one.
 */

const AUTH_BASE = '/api/auth'

export type Navigate = (url: string) => void

const goThere: Navigate = (url) => {
  window.location.assign(url)
}

/**
 * Sends the browser to a provider's consent screen.
 *
 * `callbackURL` is where the provider returns the person *after* the OAuth
 * round trip, which is a different thing from the `redirectUri` an operator
 * registers with the provider. That one belongs to the server and is not the
 * client's to choose.
 */
export async function signInWith(
  provider: string,
  options: { navigate?: Navigate; callbackURL?: string } = {},
): Promise<void> {
  const response = await fetch(`${AUTH_BASE}/sign-in/social`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      provider,
      callbackURL: options.callbackURL ?? '/',
    }),
  })

  if (!response.ok) {
    throw new Error(`Could not start sign-in with ${provider}`)
  }

  const body = (await response.json()) as { url?: string }
  if (!body.url) {
    // A 200 with no URL means the provider is configured on the client's
    // side and not the server's. Failing loudly beats a button that looks
    // like it did something.
    throw new Error(`No sign-in URL came back for ${provider}`)
  }

  ;(options.navigate ?? goThere)(body.url)
}

/**
 * Ends the session and reloads onto whatever the anonymous view is.
 *
 * The reload is deliberate rather than a state update: perms, the Alerts
 * tab's visibility and the map's own filters are all derived from the
 * session, and re-deriving them by hand is how one of them gets missed.
 */
export async function signOut(
  options: { navigate?: Navigate } = {},
): Promise<void> {
  const response = await fetch(`${AUTH_BASE}/sign-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error('Could not sign out')
  }

  ;(options.navigate ?? goThere)('/')
}

/** What to call each provider in a button. Anything else uses its own name. */
const PROVIDER_LABEL: Record<string, string> = {
  discord: 'Discord',
  telegram: 'Telegram',
  local: 'a username and password',
}

export function providerLabel(provider: string): string {
  return PROVIDER_LABEL[provider] ?? provider
}

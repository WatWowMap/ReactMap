/* eslint-disable no-console */
import type { GetServerSettings } from '@rm/server/src/utils/getServerSettings'
type FetchError = { error: boolean; status: number }

export async function getSettings(): Promise<GetServerSettings | FetchError> {
  try {
    const response = await fetch('/api/settings')
    if (!response.ok) {
      throw new Error(`${response.status} (${response.statusText})`)
    }
    const body = await response.json()
    return body
  } catch (error) {
    console.error(
      error.message,
      '\nUnable to fetch settings at this time, please try again later.',
    )
    return { error: true, status: 500 }
  }
}

export async function login(
  user: { username: string; password: string },
  endpoint: string = '/auth/local/callback',
): Promise<Response | FetchError> {
  try {
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    })
  } catch (error) {
    console.error(
      error.message,
      '\nUnable to login at this time, please try again later.',
    )
    return { error: true, status: 500 }
  }
}

export async function sendError(
  error: Error & { uuid: string },
): Promise<Response | FetchError> {
  try {
    return fetch('/api/error/client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        version: CONFIG.client.version,
      },
      body: JSON.stringify(error),
    })
  } catch (e) {
    console.error(
      e.message,
      '\nWell, this is awkward, we were unable to report the error to the server.',
    )
    return { error: true, status: 500 }
  }
}

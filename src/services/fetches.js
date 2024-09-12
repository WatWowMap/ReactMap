// @ts-check
/* eslint-disable no-console */

/**
 * @typedef {{ error: boolean, status: number }} FetchError
 */
/**
 *
 * @returns {Promise<ReturnType<typeof import('../../server/src/utils/getServerSettings')> | FetchError>}
 */
export async function getSettings() {
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

/**
 * @param {{ username: string, password: string }} user
 * @param {string} endpoint
 * @returns {Promise<Response | FetchError>}
 */
export async function login(user, endpoint = '/auth/local/callback') {
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

/**
 *
 * @param {Error & { uuid: string }} error
 * @returns {Promise<Response | FetchError>}
 */
export async function sendError(error) {
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

/* eslint-disable no-console */

export default class Fetch {
  static async getSettings() {
    try {
      const response = await fetch('/settings')
      if (!response.ok) {
        throw new Error(`${response.status} (${response.statusText})`)
      }
      const body = await response.json()
      return body.serverSettings
    } catch (error) {
      console.error(error.message, '\nUnable to fetch settings at this time, please try again later.')
      return { error: true, status: 500 }
    }
  }

  static async login(user, endpoint = '/auth/local/callback') {
    try {
      return fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      })
    } catch (error) {
      console.error(error.message, '\nUnable to login at this time, please try again later.')
      return { error: true, status: 500 }
    }
  }
}

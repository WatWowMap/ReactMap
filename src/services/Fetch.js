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
      return { error: true }
    }
  }

  static async getIcons(iconPath) {
    try {
      const response = await fetch(`${iconPath}/index.json`)
      if (!response.ok) {
        throw new Error(`${response.status} (${response.statusText})`)
      }
      return response.json()
    } catch (error) {
      console.error(error.message, `Unable to fetch ${iconPath} at this time, please try again later.`)
      return { error: true }
    }
  }
}

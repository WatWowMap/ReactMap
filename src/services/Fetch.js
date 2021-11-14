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

  static async getIcons(iconPath, name) {
    try {
      const response = await fetch(`${iconPath}/index.json`)
      if (!response.ok) {
        throw new Error(`${response.status} (${response.statusText})`)
      }
      const body = await response.json()
      localStorage.setItem(`${name}_icons`, JSON.stringify({ ...body, lastFetched: Date.now() }))
      return body
    } catch (error) {
      console.error(error.message, `Unable to fetch ${iconPath} at this time, attempting to load from cache.`)
      const cached = localStorage.getItem(`${name}_icons`)
      if (cached) {
        return JSON.parse(cached)
      }
      console.warn(`Cache does not exist for ${name}`)
    }
  }

  static async getInvasions(invasions) {
    try {
      const newInvasions = {}
      const response = await fetch('https://raw.githubusercontent.com/ccev/pogoinfo/v2/active/grunts.json')
      const pogoInfo = await response.json()
      Object.entries(invasions).forEach(gruntType => {
        const [type, info] = gruntType
        const latest = pogoInfo ? pogoInfo[type] : {}

        newInvasions[type] = invasions[type]
        if (info.encounters) {
          Object.keys(info.encounters).forEach((position, i) => {
            if (latest && latest.active) {
              newInvasions[type].encounters[position] = latest.lineup.team[i].map((pkmn, j) => (
                pkmn.template === 'UNSET' && info.encounters[position][j]
                  ? info.encounters[position][j]
                  : { id: pkmn.id, form: pkmn.form }))
              newInvasions[type].second_reward = latest.lineup.rewards.length > 1
            }
          })
        }
      })
      localStorage.setItem('invasions_cache', JSON.stringify({ ...newInvasions, lastFetched: Date.now() }))
      return newInvasions
    } catch (e) {
      console.log('Unable to fetch most recent Invasions')
      const cached = localStorage.getItem('invasions_cache')
      if (cached) {
        return JSON.parse(cached)
      }
      return invasions
    }
  }
}

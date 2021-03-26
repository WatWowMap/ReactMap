import fetchSettings from './data/settings.js' 
import fetchAvailableQuests from './data/quests.js'
class Fetch {

  static async fetchSettings() {
    return await fetchSettings()
  }

  static async fetchAvailableQuests() {
    return await fetchAvailableQuests()
  }

}

export default Fetch

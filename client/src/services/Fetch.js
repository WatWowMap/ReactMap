import fetchSettings from './data/settings.js' 

class Fetch {

  static async fetchSettings() {
    return await fetchSettings()
  }
  
}

export default Fetch
import fetchConfig from './data/config.js' 

class Fetch {

  static async fetchConfig() {
    return await fetchConfig()
  }
  
}

export default Fetch
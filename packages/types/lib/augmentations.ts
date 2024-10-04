import type { Config, ConfigAreas } from './config'
import type { ExpressUser, Permissions } from './server'

declare module 'config' {
  interface IConfig extends Config {
    // getSafe: GetSafeConfig
    getSafe: IConfig['get']
    /**
     * Due to the complexity of how the config package is cached, it's better to return the old config with this method and get the new config with a separate `require` call.
     * @returns The old config object.
     */
    reload: () => IConfig
    setAreas: (newAreas: ConfigAreas) => void
  }
}

declare global {
  namespace Express {
    interface User extends ExpressUser {}
  }
}

declare module 'express-session' {
  interface SessionData {
    tutorial: boolean
  }
}

declare module 'passport-discord' {
  interface StrategyOptionsWithRequest {
    prompt?: string | undefined
  }
}

declare module '@mui/material/styles' {
  interface Palette {
    discord: {
      main: string
      green: string
      yellow: string
      fuchsia: string
      red: string
    }
  }

  interface PaletteOptions {
    discord?: {
      main: string
      green: string
      yellow: string
      fuchsia: string
      red: string
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    cooldown?: number
    perms?: Permissions
  }
}

declare module 'http' {
  interface IncomingMessage {
    bodySize?: number
  }
}

declare module 'ohbem' {
  export = Ohbem
}

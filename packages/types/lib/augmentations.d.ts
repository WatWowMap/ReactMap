import { ButtonProps } from '@mui/material'
import { Config, GetSafeConfig } from './config'
import { ExpressUser, Permissions } from './server'
import { Request } from 'express'

declare module 'config' {
  interface IConfig extends Config {
    getSafe: GetSafeConfig
    getMapConfig: (request: Request) => Config['map']
    getAreas: <T extends 'scanAreas' | 'scanAreasMenu'>(
      request: Request,
      key: T,
    ) => T extends 'scanAreas'
      ? Config['areas']['scanAreas'][string]
      : Config['areas']['scanAreasMenu'][string]
  }
}

declare global {
  namespace Express {
    interface User extends ExpressUser {}
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

// TODO
// declare module '@mui/material/Button' {
//   interface ExtendButtonTypeMap {
//     bgcolor?: string
//   }
// }

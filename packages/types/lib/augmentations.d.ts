import { ButtonProps } from '@mui/material'
import { GetSafeConfig } from './config'
import { User as MyUser } from './server'

declare module 'config' {
  interface IConfig {
    getSafe: GetSafeConfig
  }
}

declare global {
  namespace Express {
    interface User extends MyUser {}
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

// TODO
// declare module '@mui/material/Button' {
//   interface ExtendButtonTypeMap {
//     bgcolor?: string
//   }
// }

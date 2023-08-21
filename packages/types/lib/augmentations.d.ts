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

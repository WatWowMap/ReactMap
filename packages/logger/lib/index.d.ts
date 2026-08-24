import { LogLevelNames } from 'loglevel'
import { Logger } from './Logger'
import { TAGS } from './tags'

type Helpers = typeof TAGS

declare module '@rm/logger' {
  const TAGS: Helpers
  const log: Logger<['logger']>['log']
  function setGlobalLogLevel(level: LogLevelNames): void

  export { Logger, log, setGlobalLogLevel, TAGS }
}

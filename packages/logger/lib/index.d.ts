import { OnlyType } from '@rm/types'

import { TAGS } from './tags'
import { LogLevelNames } from 'loglevel'
import { Logger } from './Logger'

type Helpers = typeof TAGS

declare module '@rm/logger' {
  const TAGS: Helpers
  const log: Logger<['logger']>['log']
  function setGlobalLogLevel(level: LogLevelNames): void
  export { TAGS as TAGS, log, Logger, setGlobalLogLevel }
}

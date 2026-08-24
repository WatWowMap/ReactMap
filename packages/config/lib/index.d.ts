import type { IConfig } from 'config'
import type { Request } from 'express'

// `lib/index.js` attaches these methods to the `config` package's instance
// at runtime (see `getSafe`, `reload`, `getMapConfig`, `getAreas`,
// `setAreas` there); the upstream `config` package's own types have no idea
// they exist. `@rm/types`' `declare module 'config'` augmentation covers
// this for `.ts` callers that import `@rm/types`, but nothing in
// `server/src` does that, so every `.js` caller under `// @ts-check` saw
// "Property 'x' does not exist on type 'IConfig'" instead. Declaring the
// shape directly on this package's own export removes that dependency on
// another package happening to be in the same compilation.
//
// Deliberately loose (`any`-returning) rather than the strict
// `Paths<Config>`-keyed signature `@rm/types` uses for `.tsx` callers:
// server/src has hundreds of existing `getSafe` call sites this task does
// not touch, and forcing them through a literal-path generic here would
// turn this into an unrelated audit of every one of them.
interface RmConfig extends IConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSafe<T = any>(key: string): T
  /**
   * Due to the complexity of how the config package is cached, it's better
   * to return the old config with this method and get the new config with
   * a separate `require` call.
   */
  reload(): RmConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMapConfig(request: Request): any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAreas(request: Request, key: string): any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setAreas(newAreas: unknown): void
}

declare const config: RmConfig

export = config

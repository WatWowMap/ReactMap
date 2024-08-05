export declare class Logger<Tags extends string[]> {
  log: import('loglevel').Logger
  #tags: Tags

  constructor(...tags: Tags)

  static #formatTags(tags: string[]): string
  static getTimestamp(): string

  get loggerTag(): Tags extends [infer First, ...infer Rest]
    ? Rest extends string[]
      ? `${First & string}.${Rest[number]}`
      : `${First & string}`
    : ''
}

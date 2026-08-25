export declare class Logger<Tags extends string[]> {
  log: import('loglevel').Logger

  constructor(...tags: Tags)
  static getTimestamp(): string

  get loggerTag(): Tags extends [infer First, ...infer Rest]
    ? Rest extends string[]
      ? `${First & string}.${Rest[number]}`
      : `${First & string}`
    : ''
}

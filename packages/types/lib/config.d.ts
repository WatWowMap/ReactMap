import type { LogLevelNames } from 'loglevel'
import config = require('server/src/configs/default.json')
import example = require('server/src/configs/local.example.json')

import type { Schema } from './server'
import type { DialogProps } from '@mui/material'

type BaseConfig = typeof config
type ExampleConfig = typeof example

export interface Config<Client extends boolean = false>
  extends Omit<
    BaseConfig,
    | 'webhooks'
    | 'devOptions'
    | 'authentication'
    | 'api'
    | 'map'
    | 'multiDomains'
    | 'database'
    | 'scanner'
    | 'icons'
  > {
  client: Client extends true
    ? {
        version: string
        locales: string[]
        hasCustom: boolean
        title: string
      }
    : never
  webhooks: Webhook[]
  devOptions: {
    logLevel: LogLevelNames
    skipUpdateCheck?: boolean
  } & BaseConfig['devOptions']
  areas: Awaited<ReturnType<typeof import('server/src/services/areas')>>
  authentication: {
    areaRestrictions: { roles: string[]; areas: string[] }[]
    excludeFromTutorial: (keyof BaseConfig['authentication']['perms'])[]
    alwaysEnabledPerms: (keyof BaseConfig['authentication']['perms'])[]
    aliases: { role: string; name: string }[]
    methods: string[]
    strategies: [
      {
        trialPeriod: {
          start: {
            js: Date
          } & Exclude<
            BaseConfig['authentication']['strategies'][number]['trialPeriod'],
            undefined
          >['start']
          end: {
            js: Date
          } & Exclude<
            BaseConfig['authentication']['strategies'][number]['trialPeriod'],
            undefined
          >['end']
        } & BaseConfig['authentication']['strategies'][number]['trialPeriod']
      } & BaseConfig['authentication']['strategies'][number],
    ]
  } & BaseConfig['authentication']
  api: {
    pvp: {
      leagues: {
        name: string
        cp: number
        minRank?: number
        maxRank?: number
      }[]
      leagueObj: Record<string, number>
    } & BaseConfig['api']['pvp']
  } & BaseConfig['api']
  map: {
    messageOfTheDay: {
      settings: {
        parentStyle: Record<string, string> // should be CSS properties but performance seems to die
      } & Omit<BaseConfig['map']['messageOfTheDay']['settings'], 'parentStyle'>
      titles: string[]
      components: CustomComponent[]
      footerButtons: CustomComponent[]
      dialogMaxWidth: DialogProps['maxWidth']
    } & Omit<
      BaseConfig['map']['messageOfTheDay'],
      'settings' | 'titles' | 'components' | 'footerButtons' | 'dialogMaxWidth'
    >
    donationPage: {
      settings: {
        parentStyle: Record<string, string> // should be CSS properties but performance seems to die
      } & BaseConfig['map']['donationPage']['settings']
      titles: string[]
      components: CustomComponent[]
      footerButtons: CustomComponent[]
    } & Omit<
      BaseConfig['map']['donationPage'],
      'settings' | 'titles' | 'components' | 'footerButtons'
    >
    loginPage: {
      settings: {
        parentStyle: Record<string, string> // should be CSS properties but performance seems to die
      } & BaseConfig['map']['loginPage']['settings']
      components: CustomComponent[]
    } & Omit<BaseConfig['map']['loginPage'], 'settings' | 'components'>
  } & BaseConfig['map']
  multiDomains: (BaseConfig['map'] & { domain: string })[]
  multiDomainsObj: Record<string, BaseConfig['map'] & { domain: string }>
  database: {
    schemas: Schema[]
    settings: {
      extraUserFields: string[]
    } & BaseConfig['database']['settings']
  } & BaseConfig['database']
  scanner: {
    scanNext: {
      discordRoles: string[]
      telegramGroups: string[]
      local: string[]
    } & BaseConfig['scanner']['scanNext']
    scanZone: {
      discordRoles: string[]
      telegramGroups: string[]
      local: string[]
    } & BaseConfig['scanner']['scanZone']
  } & BaseConfig['scanner']
  icons: {
    customizable: string[]
    styles: ExampleConfig['icons']['styles'][number][]
    defaultIcons: Record<string, string>
  } & Omit<BaseConfig['icons'], 'customizable' | 'styles' | 'defaultIcons'>
  manualAreas: ExampleConfig['manualAreas'][number][]
}

export interface Webhook {
  enabled: boolean
  provider: 'poracle'
  name: string
  host: string
  port: number
  poracleSecret: string
  addressFormat?: string
  nominatimUrl?: string
  trialPeriodEligible?: boolean
  areasToSkip: string[]
  discordRoles: []
  telegramGroups: []
  local: []
}

export interface CustomComponent {
  type?: string
  components?: CustomComponent[]
  donorOnly?: boolean
  freeloaderOnly?: boolean
  loggedInOnly?: boolean
  loggedOutOnly?: boolean
}

export type DeepKeys<T, P extends string = ''> = {
  [K in keyof T]-?: K extends string
    ? P extends ''
      ? `${K}` | `${K}.${DeepKeys<T[K], K>}`
      : `${P}.${K}.${DeepKeys<T[K], P & K>}`
    : never
}[keyof T]

export type ConfigPaths = DeepKeys<Config>

export type PathValue<T, P> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends DeepKeys<T[K]>
      ? PathValue<T[K], Rest>
      : never
    : never
  : P extends keyof T
  ? T[P]
  : never

export type ConfigPathValue<P extends ConfigPaths> = PathValue<Config, P>

export type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${'' extends P ? '' : '.'}${P}`
    : never
  : never

export type Prev = [
  never,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  ...0[],
]

export type Paths<T, D extends number = 10> = [D] extends [never]
  ? never
  : T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? `${K}` | Join<K, Paths<T[K], Prev[D]>>
        : never
    }[keyof T]
  : ''

export type NestedObjectPaths = Paths<Config>

export type GetSafeConfig = <P extends NestedObjectPaths>(
  path: P,
) => ConfigPathValue<P>

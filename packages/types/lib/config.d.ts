import type { LogLevelNames } from 'loglevel'
import type {
  ButtonProps,
  DialogProps,
  DividerProps,
  Grid2Props,
  SxProps,
  TypographyProps,
} from '@mui/material'
import type { UiconsIndex } from 'uicons.js'
import { Props as ImgProps } from '@components/Img'

import config = require('server/src/configs/default.json')
import example = require('server/src/configs/local.example.json')

import type { Schema } from './server'
import { OnlyType, DeepMerge, ComparisonReport } from './utility'

type BaseConfig = typeof config
type ExampleConfig = typeof example

export type ConfigAreas = Awaited<
  ReturnType<typeof import('server/src/services/areas')['loadLatestAreas']>
>

export type Config<Client extends boolean = false> = DeepMerge<
  Omit<BaseConfig, 'icons' | 'manualAreas'>,
  {
    client: Client extends true
      ? {
          version: string
          locales: string[]
          localeStatus: ReturnType<
            typeof import('@rm/locales/lib/utils')['getStatus']
          >
          hasCustom: boolean
          title: string
        }
      : never
    webhooks: Webhook[]
    devOptions: {
      logLevel: LogLevelNames
      skipUpdateCheck?: boolean
    }
    areas: ConfigAreas
    authentication: {
      areaRestrictions: { roles: string[]; areas: string[] }[]
      // Unfortunately these types are not convenient for looping the `perms` object...
      // excludeFromTutorial: (keyof BaseConfig['authentication']['perms'])[]
      // alwaysEnabledPerms: (keyof BaseConfig['authentication']['perms'])[]
      excludeFromTutorial: string[]
      alwaysEnabledPerms: string[]
      aliases: { role: string; name: string }[]
      methods: string[]
      strategies: {
        trialPeriod: {
          start: {
            js: Date
          }
          end: {
            js: Date
          }
          roles: string[]
        }
        allowedGuilds: string[]
        blockedGuilds: string[]
        allowedUsers: string[]
      }[]
    }
    api: {
      pvp: {
        leagues: {
          minRank?: number
          maxRank?: number
          littleCupRules?: boolean
        }[]
        leagueObj: {
          [key in BaseConfig['api']['pvp']['leagues'][number]['name']]:
            | number
            | { little: false; cap: number }
        }
      }
    }
    map: {
      domain?: string
      misc: {
        /** @deprecated */
        distance?: string
      }
      messageOfTheDay: {
        settings: {
          parentStyle: Record<string, string> // should be CSS properties but performance seems to die
        }
        titles: string[]
        components: CustomComponent[]
        footerButtons: CustomComponent[]
        dialogMaxWidth: DialogProps['maxWidth']
      }
      donationPage: {
        settings: {
          parentStyle: Record<string, string> // should be CSS properties but performance seems to die
        }
        titles: string[]
        components: CustomComponent[]
        footerButtons: CustomComponent[]
      }
      loginPage: {
        settings: {
          parentStyle: Record<string, string> // should be CSS properties but performance seems to die
        }
        components: CustomComponent[]
      }
    }
    multiDomains: MultiDomain[]
    multiDomainsObj: Record<string, MultiDomain>
    database: {
      schemas: Schema[]
      settings: {
        extraUserFields: (ExtraField | string)[]
      }
    }
    scanner: {
      scanNext: {
        discordRoles: string[]
        telegramGroups: string[]
        local: string[]
      }
      scanZone: {
        discordRoles: string[]
        telegramGroups: string[]
        local: string[]
      }
    }
    icons: Icons
    manualAreas: ExampleConfig['manualAreas'][number][]
  }
>

// unclear why this is needed, but it is for the MultiDomain type to parse...
type Map = Config['map']

export interface MultiDomain extends Map {
  domain: string
}

export interface Icons extends Omit<BaseConfig['icons'], 'styles'> {
  customizable: string[]
  styles: (ExampleConfig['icons']['styles'][number] & {
    data?: UiconsIndex
  })[]
  defaultIcons: Record<string, string>
}

export interface ExtraField {
  name: string
  database: string
  disabled: boolean
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

export interface GridSizes {
  xs?: number
  sm?: number
  md?: number
  lg?: number
  xl?: number
}

export interface BaseBlock {
  gridSizes?: GridSizes
  gridStyle?: React.CSSProperties
  gridSx?: SxProps
  donorOnly?: boolean
  freeloaderOnly?: boolean
  loggedInOnly?: boolean
  loggedOutOnly?: boolean
  text?: string | null
  content?: string | null
  link?: string | null
  href?: string | null
}
export interface CustomText
  extends Omit<OnlyType<TypographyProps, Function, false>>,
    BaseBlock {
  type: 'text'
}

export interface CustomDivider
  extends Omit<OnlyDType<DividerProps, Function, false>>,
    BaseBlock {
  type: 'divider'
}

export interface CustomButton
  extends Omit<OnlyType<ButtonProps, Function, false>>,
    BaseBlock {
  type: 'button'
}

export interface CustomImg extends ImgProps, BaseBlock {
  type: 'img'
}

export interface CustomDiscord extends BaseBlock {
  type: 'discord'
  link: string
}

export interface CustomTelegram extends BaseBlock {
  type: 'telegram'
  telegramBotName: string
  telegramAuthUrl: string
}

export interface CustomLocal extends BaseBlock {
  type: 'localLogin'
  localAuthUrl: string
  link: string
  style: React.CSSProperties
}

export interface CustomLocale extends BaseBlock {
  type: 'localeSelection'
}

export interface ParentBlock extends BaseBlock, Grid2Props {
  type: 'parent'
  components: CustomComponent[]
}

export type CustomComponent =
  | CustomText
  | CustomDivider
  | CustomButton
  | CustomImg
  | CustomDiscord
  | CustomTelegram
  | CustomLocal
  | CustomLocale
  | ParentBlock

export type DeepKeys<T, P extends string = ''> = {
  [K in keyof T]-?: K extends string
    ? P extends ''
      ? `${K}` | `${K}.${DeepKeys<T[K], K>}`
      : `${P}.${K}.${DeepKeys<T[K], P & K>}`
    : never
}[keyof T]

export type ConfigPaths<T extends object> = DeepKeys<T>

export type PathValue<T, P> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends DeepKeys<T[K]>
      ? PathValue<T[K], Rest>
      : never
    : never
  : P extends keyof T
  ? T[P]
  : never

export type ConfigPathValue<
  T extends object,
  P extends ConfigPaths<T>,
> = PathValue<T, P>

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
) => ConfigPathValue<Config, P>

export type ConfigEqualReport = ComparisonReport<Omit<Config, 'areas'>>

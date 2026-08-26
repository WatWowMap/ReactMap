import type { DialogProps } from '@mui/material'
import type { LogLevelNames } from 'loglevel'
import type { UiconsIndex } from 'uicons.js'

import type { CustomComponent } from './blocks'

import config = require('../../../config/default.json')
import example = require('../../../config/local.example.json')

import { TileLayer } from './client'
import { Strategy } from './general'
import type { Schema } from './server'
import { ComparisonReport, DeepMerge, ObjectPathValue, Paths } from './utility'

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
          title: string
        }
      : never
    poracle: Poracle
    tileServers: TileLayer[]
    devOptions: {
      logLevel: LogLevelNames
      skipUpdateCheck?: boolean
    }
    defaultFilters: {
      s2cells: {
        cells: number[]
      }
    }
    areas: ConfigAreas
    authentication: {
      areaRestrictions: { roles: string[]; areas: string[] }[]
      // Unfortunately these types are not convenient for looping the `perms` object...
      // excludeFromTutorial: (keyof BaseConfig['authentication']['perms'])[]
      // alwaysEnabledPerms: (keyof BaseConfig['authentication']['perms'])[]
      excludeFromTutorial: string[]
      alwaysEnabledPerms: string[]
      aliases: { role: string | string[]; name: string }[]
      methods: Strategy[]
      strategies: {
        type: Strategy
        trialPeriod: {
          start: TrialPeriodDate
          end: TrialPeriodDate
          roles: string[]
        }
        allowedGuilds: string[]
        blockedGuilds: string[]
        allowedUsers: string[]
      }[]
      perms: {
        [K in keyof BaseConfig['authentication']['perms']]: Omit<
          BaseConfig['authentication']['perms'][K],
          'roles'
        > & { roles: string[] }
      }
    }
    api: {
      pvp: {
        leagues: {
          minRank?: number
          maxRank?: number
        }[]
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
        cooldownBypass: {
          discordRoles: string[]
          telegramGroups: string[]
          local: string[]
        }
      }
      scanZone: {
        discordRoles: string[]
        telegramGroups: string[]
        local: string[]
        cooldownBypass: {
          discordRoles: string[]
          telegramGroups: string[]
          local: string[]
        }
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

export type StrategyConfig = Config['authentication']['strategies'][number]

export interface TrialPeriodDate {
  year?: number
  month?: number
  day?: number
  hour?: number
  minute?: number
  second?: number
  millisecond?: number
}

export interface ExtraField {
  name: string
  database: string
  disabled: boolean
}

export interface Poracle {
  enabled: boolean
  host: string
  port: number
  poracleSecret: string
  addressFormat?: string
  /** Base URL of the geocoding backend. Used for both providers. */
  nominatimUrl?: string
  /**
   * Which geocoding backend `nominatimUrl` points at. Photon speaks GeoJSON
   * rather than Nominatim's JSON, so it needs its own request and response
   * handling. Defaults to `nominatim`.
   */
  geocoderProvider?: 'nominatim' | 'photon'
  areasToSkip: string[]
  /**
   * Poracle's own category names that this deployment refuses, `monster`
   * among them. An operator turning a category off here turns it off for
   * everyone, before any human's own `blocked_alerts` is consulted.
   */
  disabledHooks: string[]
  discordRoles: string[]
  telegramGroups: string[]
  local: string[]
}

export interface GridSizes {
  xs?: number
  sm?: number
  md?: number
  lg?: number
  xl?: number
}

export type GetSafeConfig = <P extends Paths<Config>>(
  path: P,
) => ObjectPathValue<Config, P>

export type ConfigEqualReport = ComparisonReport<Omit<Config, 'areas'>>

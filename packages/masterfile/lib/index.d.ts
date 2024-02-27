import type { AdvCategories, Rarity } from '@rm/types'

export interface MasterfileForm {
  name: string
  rarity?: string
  isCostume?: boolean
  category?: AdvCategories
  types?: number[]
}

export interface MasterfilePokemon {
  name: string
  pokedexId: number
  defaultFormId: number
  types: number[]
  quickMoves: number[]
  chargedMoves: number[]
  genId: number
  forms: {
    [formId: string]: MasterfileForm
  }
  height?: number
  weight?: number
  family?: number
  legendary?: boolean
  mythical?: boolean
  ultraBeast?: boolean
  rarity?: string
  historic?: string
  tempEvolutions?: {
    [evolutionId: string]: {}
  }
}

export interface MasterfileObject {
  [typeId: string]: string
}

export interface MasterfileMove {
  name: string
  type: number
}

export interface InvasionPokemon {
  id: number
  form: number
}

export interface InvasionRewards {
  first: InvasionPokemon[]
  second: InvasionPokemon[]
  third: InvasionPokemon[]
}

export interface Invasion {
  type: string
  gender: number
  grunt: string
  firstReward: boolean
  secondReward: boolean
  thirdReward: boolean
  encounters: InvasionRewards
}

export interface MasterfileWeather {
  name: string
  types: number[]
}

export interface Masterfile {
  pokemon: Record<string, MasterfilePokemon>
  types: MasterfileObject
  items: MasterfileObject
  questRewardTypes: MasterfileObject
  moves: Record<string, MasterfileMove>
  invasions: Record<string, Invasion>
  weather: Record<string, MasterfileWeather>
}

export declare function generate(
  save?: boolean,
  historicRarity?: Rarity,
  dbRarity?: Rarity,
): Promise<Masterfile>

export declare function read(): Masterfile

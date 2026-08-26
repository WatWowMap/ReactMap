import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import type { AlertRow } from '../rules/poracle-vocabulary'
import { setupDom, teardownDom } from '../test-setup'
import { AlertCard } from './alert-card'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

const BASE: AlertRow = {
  uid: 7,
  profileNo: 1,
  pokemonId: 149,
  form: 0,
  costume: 0,
  ping: '',
  clean: false,
  distance: 0,
  template: '',
  overrideLocationLabel: null,
  ivMin: null,
  ivMax: null,
  cpMin: null,
  cpMax: null,
  levelMin: null,
  levelMax: null,
  atkMin: null,
  atkMax: null,
  defMin: null,
  defMax: null,
  staMin: null,
  staMax: null,
  gender: null,
  weightMin: null,
  weightMax: null,
  minTime: null,
  rarityMin: null,
  rarityMax: null,
  sizeMin: null,
  sizeMax: null,
  pvpLeague: null,
  pvpRankBest: null,
  pvpRankWorst: null,
  pvpMinCp: null,
  pvpCap: null,
  description: null,
}

test('renders the alert sentence through the Poracle vocabulary', () => {
  const { getByText } = render(
    <AlertCard alert={{ ...BASE, ivMin: 100, ivMax: 100, distance: 5000 }} />,
  )
  expect(getByText(/IV 100%/)).toBeTruthy()
  expect(getByText(/within 5 km/)).toBeTruthy()
})

test('names the species by id', () => {
  const { getByText } = render(<AlertCard alert={BASE} />)
  expect(getByText('Pokémon #149')).toBeTruthy()
})

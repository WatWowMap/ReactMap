import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react'
import type { ReactElement } from 'react'
import { ruleMap } from '../rules/rule-fixtures'
import type { MasterfileClient, SpeciesEntry } from '../rules/use-names'
import { setupDom, teardownDom } from '../test-setup'
import { Popup } from './popup'
import type { GymEntity, PokemonEntity } from './types'

/*
 * The popup is a plain function of `entity`, `x`, `y`, `now` and
 * `onClose`; nothing here needs a map, a camera or WebGL. What genuinely
 * needs a browser - whether the position this renders at actually
 * survives a real pan or zoom - is `useMapLibre`'s reprojection, covered
 * (as far as it can be without a GPU) in useMapLibre.test.ts, and stated
 * plainly in task-5-report.md as something only manual/browser
 * verification can back.
 */

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

const POKEMON: PokemonEntity = {
  kind: 'pokemon',
  spawnId: 'spawn-1',
  pokemonId: 25,
  form: 0,
  costume: 0,
  gender: 1,
  lat: 51.5,
  lon: -0.1,
  expiresAt: 90_000,
  iv: 87,
}

const SPECIES: SpeciesEntry[] = [
  { id: 25, name: 'Pikachu', forms: [] },
  {
    id: 20,
    name: 'Raticate',
    forms: [{ id: 48, name: 'Alola', label: 'Raticate (Alola)' }],
  },
]

/** The masterfile the popup's `useNames` reads, without a network. */
function fakeNames(species: SpeciesEntry[] = []): MasterfileClient {
  return { species: () => Promise.resolve(species) }
}

/**
 * `useNames` is a react-query hook, so every render needs a provider --
 * the app supplies one in `app.tsx`. An empty catalog is the pre-load
 * state, where every id still falls back to its own `#id`.
 */
function renderPopup(node: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>,
  )
}

const GYM: GymEntity = {
  kind: 'gym',
  gymId: 'gym-1',
  lat: 40.7,
  lon: -74,
  team: 2,
  inBattle: true,
}

test('positions itself at the fixed x/y it is given, not something it computes', () => {
  const { container } = renderPopup(
    <Popup
      entity={POKEMON}
      x={123}
      y={45}
      onClose={() => {}}
      now={0}
      namesClient={fakeNames()}
    />,
  )
  const card = container.querySelector('[data-slot="map-popup"]')
  expect(card).toBeTruthy()
  expect((card as HTMLElement).style.left).toBe('123px')
  expect((card as HTMLElement).style.top).toBe('33px')
})

test("shows a pokemon entity's species, IV and countdown", () => {
  const { container } = renderPopup(
    <Popup
      entity={POKEMON}
      x={0}
      y={0}
      onClose={() => {}}
      now={0}
      namesClient={fakeNames()}
    />,
  )
  expect(within(container).getByText('Pokemon #25')).toBeTruthy()
  expect(within(container).getByText(/87% IV/)).toBeTruthy()
  expect(within(container).getByText(/1:30/)).toBeTruthy()
})

test("shows a gym entity's team and battle state", () => {
  const { container } = renderPopup(
    <Popup
      entity={GYM}
      x={0}
      y={0}
      onClose={() => {}}
      now={0}
      namesClient={fakeNames()}
    />,
  )
  expect(within(container).getByText('Gym (in battle)')).toBeTruthy()
  expect(within(container).getByText('Team 2')).toBeTruthy()
})

test('the team swatch reads its colour from the data palette token, not a literal', () => {
  const { container } = renderPopup(
    <Popup
      entity={GYM}
      x={0}
      y={0}
      onClose={() => {}}
      now={0}
      namesClient={fakeNames()}
    />,
  )
  const swatch = container.querySelector('[aria-hidden="true"].rounded-full')
  expect((swatch as HTMLElement).style.backgroundColor).toBe(
    'var(--color-team-2)',
  )
})

/**
 * `matched` plus a `rules` map is all the popup's "why" lines need --
 * `resolveAppearance` and the rule names read straight off it, nothing
 * else is fetched. `ruleMap` (`rule-fixtures.ts`) fills every column this
 * suite doesn't care about with its usual defaults.
 */
function renderPopupWithRules({
  matched,
  rules,
}: {
  matched: number[]
  rules: ReturnType<typeof ruleMap>
}) {
  const entity: PokemonEntity = { ...POKEMON, matched }
  return renderPopup(
    <Popup
      entity={entity}
      x={0}
      y={0}
      onClose={() => {}}
      now={0}
      rules={rules}
      namesClient={fakeNames()}
    />,
  )
}

test('the popup names every rule that matched', () => {
  const { container } = renderPopupWithRules({
    matched: [7, 12],
    rules: ruleMap([
      { id: 7, name: 'Hundos', size: 'xl', glow: '#ffc83d', notify: true },
      { id: 12, name: 'Great League', glow: '#4f8cff' },
    ]),
  })
  expect(
    within(container).getByText(/Extra large because Hundos matched/),
  ).toBeTruthy()
  expect(
    within(container).getByText(/Blue ring from Great League/),
  ).toBeTruthy()
  expect(
    within(container).getByText(/Notifying, because Hundos asks to/),
  ).toBeTruthy()
})

test('the popup says what did not happen, too', () => {
  const { container } = renderPopupWithRules({
    matched: [88],
    rules: ruleMap([{ id: 88, name: 'Rare spawns', size: 'lg' }]),
  })
  expect(
    within(container).getByText(
      /Not notifying, because no matching rule asks to/,
    ),
  ).toBeTruthy()
})

test('closing calls back exactly once per click', () => {
  let closeCount = 0
  const { container } = renderPopup(
    <Popup
      entity={POKEMON}
      x={0}
      y={0}
      onClose={() => {
        closeCount += 1
      }}
      now={0}
      namesClient={fakeNames()}
    />,
  )
  const closeButton = within(container).getByRole('button', {
    name: 'Close',
  })
  fireEvent.click(closeButton)
  expect(closeCount).toBe(1)
})

test('the title names the species once the catalog loads', async () => {
  const { container } = renderPopup(
    <Popup
      entity={POKEMON}
      x={0}
      y={0}
      onClose={() => {}}
      now={0}
      namesClient={fakeNames(SPECIES)}
    />,
  )
  expect(within(container).getByText('Pokemon #25')).toBeTruthy()
  await waitFor(() => {
    expect(within(container).getByText('Pikachu')).toBeTruthy()
  })
})

test('the title names the form, not just the species', async () => {
  const { container } = renderPopup(
    <Popup
      entity={{ ...POKEMON, pokemonId: 20, form: 48 }}
      x={0}
      y={0}
      onClose={() => {}}
      now={0}
      namesClient={fakeNames(SPECIES)}
    />,
  )
  await waitFor(() => {
    expect(within(container).getByText('Raticate (Alola)')).toBeTruthy()
  })
})

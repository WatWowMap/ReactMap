import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
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

const GYM: GymEntity = {
  kind: 'gym',
  gymId: 'gym-1',
  lat: 40.7,
  lon: -74,
  team: 2,
  inBattle: true,
}

test('positions itself at the fixed x/y it is given, not something it computes', () => {
  const { container } = render(
    <Popup entity={POKEMON} x={123} y={45} onClose={() => {}} now={0} />,
  )
  const card = container.querySelector('[data-slot="map-popup"]')
  expect(card).toBeTruthy()
  expect((card as HTMLElement).style.left).toBe('123px')
  expect((card as HTMLElement).style.top).toBe('33px')
})

test("shows a pokemon entity's species, IV and countdown", () => {
  const { container } = render(
    <Popup entity={POKEMON} x={0} y={0} onClose={() => {}} now={0} />,
  )
  expect(within(container).getByText('Pokemon #25')).toBeTruthy()
  expect(within(container).getByText(/87% IV/)).toBeTruthy()
  expect(within(container).getByText(/1:30/)).toBeTruthy()
})

test("shows a gym entity's team and battle state", () => {
  const { container } = render(
    <Popup entity={GYM} x={0} y={0} onClose={() => {}} now={0} />,
  )
  expect(within(container).getByText('Gym (in battle)')).toBeTruthy()
  expect(within(container).getByText('Team 2')).toBeTruthy()
})

test('the team swatch reads its colour from the data palette token, not a literal', () => {
  const { container } = render(
    <Popup entity={GYM} x={0} y={0} onClose={() => {}} now={0} />,
  )
  const swatch = container.querySelector('[aria-hidden="true"].rounded-full')
  expect((swatch as HTMLElement).style.backgroundColor).toBe(
    'var(--color-team-2)',
  )
})

test('closing calls back exactly once per click', () => {
  let closeCount = 0
  const { container } = render(
    <Popup
      entity={POKEMON}
      x={0}
      y={0}
      onClose={() => {
        closeCount += 1
      }}
      now={0}
    />,
  )
  const closeButton = within(container).getByRole('button', {
    name: 'Close',
  })
  fireEvent.click(closeButton)
  expect(closeCount).toBe(1)
})

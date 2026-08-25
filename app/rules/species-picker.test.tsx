import { afterAll, afterEach, beforeAll, expect, test, vi } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { setupDom, teardownDom } from '../test-setup'
import type { SpeciesEntry, SpeciesSelection } from './species-picker'
import { DEFAULT_ICON_BASE, SpeciesPicker } from './species-picker'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

interface RawFormEntry {
  id: number
  name: string
  label?: string
}

interface RawSpeciesEntry {
  id: number
  name: string
  forms: RawFormEntry[]
}

/**
 * A form fixture without an explicit `label` still gets one -- the real
 * catalog (`server/src/services/masterfile.ts`) always sets it via
 * `names.label`, so a bare `{ id, name }` in a test fixture is composed
 * the same way here, once, rather than asking every test to spell it out.
 * `SpeciesPicker` itself never does this -- it only ever reads `.label`.
 */
function normalizeSpecies(species: RawSpeciesEntry[]): SpeciesEntry[] {
  return species.map((entry) => ({
    ...entry,
    forms: entry.forms.map((form) => ({
      ...form,
      label: form.label ?? `${entry.name} (${form.name})`,
    })),
  }))
}

/**
 * Returns the render result's own bound queries rather than the global
 * `screen` -- `@testing-library/dom`'s `screen` snapshots `document` at
 * import time, before happy-dom is registered in this file's `beforeAll`,
 * and throws on every query as a result. `rule-card.test.tsx` hits the
 * same thing and sidesteps it the same way.
 */
function renderPicker({
  species,
  selected = [],
  onChange = vi.fn(),
}: {
  species: RawSpeciesEntry[]
  selected?: SpeciesSelection[]
  onChange?: (selection: SpeciesSelection[]) => void
}) {
  const view = render(
    <SpeciesPicker
      species={normalizeSpecies(species)}
      selected={selected}
      onChange={onChange}
    />,
  )
  return { ...view, onChange }
}

const DRATINI: RawSpeciesEntry = { id: 147, name: 'Dratini', forms: [] }
const RATICATE: RawSpeciesEntry = {
  id: 20,
  name: 'Raticate',
  forms: [{ id: 46, name: 'Alola' }],
}

/** 300 distinct species so "select all shown" has something real to narrow. */
const THREE_HUNDRED_SPECIES: RawSpeciesEntry[] = [
  DRATINI,
  ...Array.from({ length: 299 }, (_, i) => ({
    id: 1000 + i,
    name: `Species${i}`,
    forms: [],
  })),
]

test('the picker lists one tile per species, not one per form', () => {
  const { getAllByRole, getByText } = renderPicker({ species: [RATICATE] })
  expect(getAllByRole('checkbox')).toHaveLength(1)
  expect(getByText('Raticate')).toBeTruthy()
})

test('search matches the composed label, so "alola" surfaces Alolan forms', () => {
  const { getByRole, getByText } = renderPicker({ species: [RATICATE] })
  fireEvent.change(getByRole('searchbox'), { target: { value: 'alola' } })
  // The label is composed the way 1.x composes it: species, then form in
  // parentheses. `form_46` is "Alola" on its own, so "alolan" matches nothing.
  expect(getByText('Raticate (Alola)')).toBeTruthy()
})

test('the picker renders the label the server composed, and builds no keys itself', () => {
  const { getByRole, getByText } = renderPicker({
    species: [
      {
        id: 20,
        name: 'Raticate',
        forms: [{ id: 46, name: 'Alola', label: 'Raticate (Alola)' }],
      },
    ],
  })
  fireEvent.click(getByRole('button', { name: /expand raticate/i }))
  expect(getByText('Raticate (Alola)')).toBeTruthy()
})

test('select all shown selects exactly the filtered set, not everything', () => {
  const { getByRole, onChange } = renderPicker({
    species: THREE_HUNDRED_SPECIES,
  })
  fireEvent.change(getByRole('searchbox'), { target: { value: 'drat' } })
  fireEvent.click(getByRole('button', { name: /select all shown/i }))
  // Only what the search narrowed to. This is the pairing that makes
  // "hundos for these 25 species" two taps instead of 25 cycles.
  expect(onChange).toHaveBeenCalledWith([147])
})

test('selecting a form alone does not select its base species', () => {
  const onChange = vi.fn()
  const { getByRole } = renderPicker({ species: [RATICATE], onChange })
  fireEvent.click(getByRole('button', { name: /expand raticate/i }))
  fireEvent.click(getByRole('checkbox', { name: 'Raticate (Alola)' }))
  // (20, 46) alone. Selecting a form must not imply (20, null).
  expect(onChange).toHaveBeenCalledWith([{ speciesId: 20, formId: 46 }])
})

test('each species tile draws its default form art', () => {
  const { container } = renderPicker({ species: [RATICATE] })
  const art = container.querySelectorAll('img')
  expect(art).toHaveLength(1)
  expect(art[0]?.getAttribute('src')).toBe(
    `${DEFAULT_ICON_BASE}/pokemon/20.webp`,
  )
})

test('an expanded form row draws that form art, not the species art', () => {
  const { container, getByRole } = renderPicker({ species: [RATICATE] })
  fireEvent.click(getByRole('button', { name: /expand raticate/i }))
  const sources = [...container.querySelectorAll('img')].map((img) =>
    img.getAttribute('src'),
  )
  expect(sources).toEqual([
    `${DEFAULT_ICON_BASE}/pokemon/20.webp`,
    `${DEFAULT_ICON_BASE}/pokemon/20_f46.webp`,
  ])
})

test('a caller can point the art at its own configured UICONS style', () => {
  const { container } = render(
    <SpeciesPicker
      species={normalizeSpecies([DRATINI])}
      iconBase="https://icons.example/style"
    />,
  )
  expect(container.querySelector('img')?.getAttribute('src')).toBe(
    'https://icons.example/style/pokemon/147.webp',
  )
})

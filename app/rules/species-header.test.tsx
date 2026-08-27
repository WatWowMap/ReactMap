import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { setupDom, teardownDom } from '../test-setup'
import { SpeciesHeader } from './species-header'
import { EMPTY_LOOKUP, type NamesLookup } from './use-names'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

const NAMES: NamesLookup = {
  species: (id) => (id === 778 ? 'Mimikyu' : `#${id}`),
  label: (speciesId, formId) => {
    if (speciesId !== 778) return `#${speciesId}`
    return formId === 1042 ? 'Mimikyu Busted' : 'Mimikyu'
  },
}

test('the header names the species and its form, not the id', () => {
  const { getByText, queryByText } = render(
    <SpeciesHeader speciesId={778} formId={1042} names={NAMES} />,
  )
  expect(getByText('Mimikyu Busted')).toBeTruthy()
  // The id stays visible as a subtitle, but it is no longer the headline.
  expect(queryByText('Pokémon #778')).toBeNull()
})

test('a rule with no single subject says so instead of naming one', () => {
  const { getByText, queryByText } = render(
    <SpeciesHeader speciesId={null} names={NAMES} />,
  )
  expect(getByText('Any Pokémon')).toBeTruthy()
  // `#null` is the shape this produced before the null case was handled.
  expect(queryByText(/#null|#0/)).toBeNull()
})

test('the sentence renders when there is one, and nothing when there is not', () => {
  const withOne = render(
    <SpeciesHeader
      speciesId={778}
      names={NAMES}
      sentence="IV 90%+ · CP 1500+"
    />,
  )
  expect(withOne.getByText('IV 90%+ · CP 1500+')).toBeTruthy()
  withOne.unmount()

  // An empty sentence is a falsy string, which must not render an empty
  // line where a sentence would be.
  const without = render(
    <SpeciesHeader speciesId={778} names={NAMES} sentence="" />,
  )
  expect(without.container.textContent).toBe('Mimikyu#778')
})

test('an unloaded catalogue shows the bare id once, not twice', () => {
  // The id subtitle sits under the name. With no catalogue the name is
  // already the id, and rendering both read as a bug.
  const { container } = render(
    <SpeciesHeader speciesId={778} names={EMPTY_LOOKUP} />,
  )
  expect(container.textContent).toBe('#778')
})

import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const palette = readFileSync(join(import.meta.dir, 'data-palette.css'), 'utf8')

test('the data palette derives nothing from the brand accent', () => {
  expect(palette).not.toContain('--color-accent')
  expect(palette).not.toContain('color-mix')
})

test('the data palette defines the groups the map depends on', () => {
  for (const group of ['team', 'league', 'iv']) {
    expect(palette).toContain(`--color-${group}-`)
  }
})

test('the data palette does not duplicate an accent value literally', () => {
  // The token-name check above misses the case this actually shipped in:
  // --color-league-ultra held the accent colour of the day, copied by value.
  // It referenced no accent token, so the name check passed while the palette
  // was in fact harmonised with the brand.
  const styles = readFileSync(join(import.meta.dir, '..', 'styles.css'), 'utf8')
  const accents = [
    ...styles.matchAll(/--color-accent-[\w-]+:\s*(#[0-9a-fA-F]{3,8})/g),
  ]
    .map((match) => match[1]?.toLowerCase())
    .filter((value): value is string => value !== undefined)
  expect(accents.length).toBeGreaterThan(0)
  for (const accent of accents) {
    expect(palette.toLowerCase()).not.toContain(accent)
  }
})

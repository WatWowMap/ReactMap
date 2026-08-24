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

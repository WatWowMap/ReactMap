import { expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { namesFrom } from '../src/services/names'

const FIXTURE = {
  poke_20: 'Raticate',
  poke_147: 'Dratini',
  form_46: 'Alola',
  form_0: 'Unset',
}

test('a species with no form is just its name', () => {
  expect(namesFrom(FIXTURE).label(147)).toBe('Dratini')
  expect(namesFrom(FIXTURE).label(147, null)).toBe('Dratini')
})

test('a form is parenthesised after the species, as 1.x composes it', () => {
  // src/features/pokemon/PokemonTile.jsx:188 is the reference.
  expect(namesFrom(FIXTURE).label(20, 46)).toBe('Raticate (Alola)')
})

test('form 0 means unset and is not rendered as a form', () => {
  expect(namesFrom(FIXTURE).label(20, 0)).toBe('Raticate')
})

test('a missing name is visible rather than empty', () => {
  // An empty tile is an invisible failure. Show something a bug report can quote.
  expect(namesFrom(FIXTURE).species(9999)).toBe('#9999')
  expect(namesFrom(FIXTURE).label(9999, 46)).toBe('#9999 (Alola)')
})

/**
 * Walks `app/` and `server/` looking for a template-literal translation
 * key built somewhere other than this module -- the thing this whole file
 * exists to catch. Scoped to the 2.0 tree (not `src/`, the 1.x app this
 * plan never touches) and to `.ts`/`.tsx` source, skipping this test file
 * itself so its own fixture/pattern text can't self-match.
 */
function grepRepo(pattern: RegExp): string[] {
  const roots = ['app', 'server']
  const skipDirs = new Set(['node_modules', '.cache'])
  const exts = new Set(['.ts', '.tsx'])
  const offenders: string[] = []

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      if (skipDirs.has(entry)) continue
      const full = join(dir, entry)
      const stats = statSync(full)
      if (stats.isDirectory()) {
        walk(full)
      } else if (
        exts.has(extname(entry)) &&
        resolve(full) !== import.meta.path
      ) {
        const text = readFileSync(full, 'utf8')
        if (pattern.test(text)) offenders.push(full)
      }
    }
  }

  for (const root of roots) walk(root)
  return offenders
}

test('nothing outside this module needs to know the key format', () => {
  // Guards the whole point of the task.
  const offenders = grepRepo(/[`'"]poke_\$\{|[`'"]form_\$\{/).filter(
    (f) => !f.includes('services/names.ts'),
  )
  expect(offenders).toEqual([])
})

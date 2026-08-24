import { expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The 1.0 client is what essentially every real user is served. Its bundle must
 * not carry code that only the 2.0 map can reach.
 *
 * This exists because vite.config.js decides chunk membership by matching
 * package paths, and that rule has now leaked five separate things into the
 * chunk 1.0 loads eagerly: tailwind's preflight reset, the fontsource font
 * faces, maplibre's stylesheet, deck.gl's rendering engine, and then deck.gl's
 * gesture, logging and text dependencies under scopes of their own. The fifth
 * shipped in the same commit whose comment predicted a fifth.
 *
 * Enumerating package names is not a fix for that, it is a fix for one instance
 * of it. Every leak so far was silent: nothing errors, no test fails, and the
 * only symptom is that people downloading a map they never open pay for it.
 * So this asserts the property directly against the built output rather than
 * trusting the rule that is supposed to produce it.
 *
 * If this fails, do not add the offending package to an ignore list here. Add
 * it to the map bucket in vite.config.js, or fix the rule properly by deciding
 * chunk membership from which entry actually reaches a module.
 */

const DIST = join(import.meta.dir, '..', 'dist')

// Substrings that only exist because of the 2.0 map stack. Each is a real
// package name as it appears in bundled module paths and identifiers.
const MAP_ONLY = [
  'maplibre-gl',
  '@deck.gl',
  '@luma.gl',
  '@math.gl',
  '@loaders.gl',
  'mjolnir.js',
  '@probe.gl',
  'tiny-sdf',
]

const readIfBuilt = () => {
  if (!existsSync(DIST)) return null
  const html = join(DIST, 'index.html')
  if (!existsSync(html)) return null
  return readFileSync(html, 'utf8')
}

test('the 1.0 entry loads no chunk containing map-only code', () => {
  const html = readIfBuilt()
  // CI runs tests before the build step, so a missing dist is not a failure.
  // The check still runs locally and in any job that builds first.
  if (html === null) return

  const referenced = [...html.matchAll(/["'(]\/([A-Za-z0-9._-]+\.js)/g)].map(
    (match) => match[1],
  )
  expect(referenced.length).toBeGreaterThan(0)

  const offenders: string[] = []
  for (const file of referenced) {
    // Read the sourcemap, not the chunk. Minification strips module paths, so
    // a package name does not survive into the bundled code and grepping for
    // one finds nothing however much of that package shipped. The sourcemap's
    // `sources` list is where the provenance actually lives, which is how the
    // 43 kB leak this guard exists for was originally attributed.
    const map = join(DIST, `${file}.map`)
    if (!existsSync(map)) continue
    const sources: string[] = JSON.parse(readFileSync(map, 'utf8')).sources
    for (const name of MAP_ONLY) {
      if (sources.some((source) => source.includes(name))) {
        offenders.push(`${file} carries ${name}`)
      }
    }
  }

  expect(offenders).toEqual([])
})

test('the map libraries are emitted as their own chunks', () => {
  if (!existsSync(DIST)) return
  const files = readdirSync(DIST)
  // Both should exist as separate chunks so the map route pays for them alone.
  expect(
    files.some((f) => f.startsWith('maplibre-') && f.endsWith('.js')),
  ).toBe(true)
  expect(files.some((f) => f.startsWith('deckgl-') && f.endsWith('.js'))).toBe(
    true,
  )
})

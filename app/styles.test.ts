import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (p: string) => readFileSync(join(import.meta.dir, p), 'utf8')

test('every font family the tokens name is actually loaded', () => {
  const tokens = read('styles.css')
  const entry = read('main.tsx')
  const families = [...tokens.matchAll(/--font-[\w-]+:\s*'([^']+)'/g)]
    .map((match) => match[1])
    .filter((family): family is string => Boolean(family))
  expect(families.length).toBeGreaterThan(0)
  for (const family of families) {
    const slug = family.toLowerCase()
    expect(`${tokens}${entry}`).toContain(`fontsource-variable/${slug}`)
  }
})

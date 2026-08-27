import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { contrast, readTokens, separation } from './contrast'

const sources = [
  readFileSync(join(import.meta.dir, '..', 'styles.css'), 'utf8'),
  readFileSync(join(import.meta.dir, 'data-palette.css'), 'utf8'),
]

const themes = {
  light: readTokens(sources, 'light'),
  dark: readTokens(sources, 'dark'),
} as const

const hex = (theme: keyof typeof themes, token: string) => {
  const value = themes[theme].get(token)
  if (value === undefined) {
    throw new Error(
      `--${token.replace(/^--/, '')} resolves to no colour in ${theme}`,
    )
  }
  return value
}

/*
 * Text on its own surface. 4.5:1 is WCAG 1.4.3 at normal weight and size,
 * which is what every one of these renders at.
 */
const TEXT: [string, string][] = [
  ['--color-foreground', '--color-background'],
  ['--color-foreground', '--color-accent'],
  ['--color-accent-foreground', '--color-accent'],
  ['--color-popover-foreground', '--color-popover'],
  ['--color-sidebar-foreground', '--color-sidebar'],
  ['--color-sidebar-accent-foreground', '--color-sidebar-accent'],
  ['--color-muted-foreground', '--color-popover'],
  ['--color-muted-foreground', '--color-sidebar'],
  ['--color-muted-foreground', '--color-accent'],
  ['--color-primary-foreground', '--color-primary'],
  ['--color-destructive-foreground', '--color-destructive'],
]

/*
 * Boundaries and indicators that identify a control. 3:1 is WCAG 1.4.11.
 * --color-border is deliberately absent: it is decoration on cards and
 * outlines, identifies nothing and carries no state, so 1.4.11 does not
 * bind it.
 */
const NON_TEXT: [string, string][] = [
  ['--color-input', '--color-background'],
  ['--color-border-strong', '--color-background'],
  ['--color-sidebar-border', '--color-sidebar'],
  ['--color-sidebar-ring', '--color-sidebar'],
  ['--color-ring', '--color-background'],
]

const CHART = ['1', '2', '3', '4', '5'].map((n) => `--color-chart-${n}`)

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: text pairs clear 4.5:1`, () => {
    for (const [fg, bg] of TEXT) {
      const ratio = contrast(hex(theme, fg), hex(theme, bg))
      expect(`${fg} on ${bg}: ${ratio.toFixed(2)}`).toBe(
        `${fg} on ${bg}: ${Math.max(ratio, 4.5).toFixed(2)}`,
      )
    }
  })

  test(`${theme}: control boundaries clear 3:1`, () => {
    for (const [fg, bg] of NON_TEXT) {
      const ratio = contrast(hex(theme, fg), hex(theme, bg))
      expect(`${fg} on ${bg}: ${ratio.toFixed(2)}`).toBe(
        `${fg} on ${bg}: ${Math.max(ratio, 3).toFixed(2)}`,
      )
    }
  })

  test(`${theme}: chart series clear 3:1 on the page`, () => {
    for (const token of CHART) {
      const ratio = contrast(
        hex(theme, token),
        hex(theme, '--color-background'),
      )
      expect(`${token}: ${ratio.toFixed(2)}`).toBe(
        `${token}: ${Math.max(ratio, 3).toFixed(2)}`,
      )
    }
  })

  test(`${theme}: chart series stay apart for a dichromat`, () => {
    for (let i = 0; i < CHART.length; i += 1) {
      for (let j = i + 1; j < CHART.length; j += 1) {
        const a = CHART[i] as string
        const b = CHART[j] as string
        const apart = separation(hex(theme, a), hex(theme, b))
        expect(`${a} vs ${b}: ${apart.toFixed(1)}`).toBe(
          `${a} vs ${b}: ${Math.max(apart, 15).toFixed(1)}`,
        )
      }
    }
  })

  test(`${theme}: no chart series is a tint of the brand`, () => {
    /*
     * --color-primary is in this list even though it aliases
     * --color-accent-from today. The dark theme overrode it separately
     * for most of this file's life, and while it did, a primary that
     * collided with a chart series would have passed here: the accent it
     * had stopped pointing at was the only thing being measured. Naming
     * it explicitly means a future override is held to the same bar as
     * the value it replaces.
     */
    const brand = [
      hex(theme, '--color-accent-from'),
      hex(theme, '--color-accent-to'),
      hex(theme, '--color-primary'),
    ]
    for (const token of CHART) {
      for (const stop of brand) {
        expect(separation(hex(theme, token), stop)).toBeGreaterThan(15)
      }
    }
  })
}

/*
 * Cluster bubbles. The count is drawn straight onto the fill, so the pair
 * that has to hold is the label against each of the three buckets. Nothing
 * else in this repo can see a colour, and these were hardcoded literals in
 * the layer until they moved into the palette, which is exactly the state in
 * which a contrast failure ships unnoticed.
 *
 * Both themes assert the same pairs because the tokens do not vary by theme:
 * a bubble sits on map tiles, not on the page background. The test still runs
 * per theme so a future theme override cannot slip past it.
 */
const CLUSTER_FILLS = [
  '--color-cluster-small',
  '--color-cluster-medium',
  '--color-cluster-large',
]

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: the cluster count clears 4.5:1 on every bubble`, () => {
    for (const fill of CLUSTER_FILLS) {
      const ratio = contrast(
        hex(theme, '--color-cluster-label'),
        hex(theme, fill),
      )
      expect(`${fill}: ${ratio.toFixed(2)}`).toBe(
        `${fill}: ${Math.max(ratio, 4.5).toFixed(2)}`,
      )
    }
  })

  test(`${theme}: the three cluster buckets stay apart for dichromats`, () => {
    for (let i = 0; i < CLUSTER_FILLS.length; i += 1) {
      for (let j = i + 1; j < CLUSTER_FILLS.length; j += 1) {
        const a = CLUSTER_FILLS[i] as string
        const b = CLUSTER_FILLS[j] as string
        const apart = separation(hex(theme, a), hex(theme, b))
        expect(`${a} vs ${b}: ${apart.toFixed(1)}`).toBe(
          `${a} vs ${b}: ${Math.max(apart, 7).toFixed(1)}`,
        )
      }
    }
  })
}

/*
 * The two source colours are what the accents are derived from, not values
 * anything paints with. Neither clears the 15 dE separation the accents
 * above are held to -- the pink lands 9.5 dE from the green chart series
 * under deuteranopia and the blue 4.0 dE from the pale blue one in dark --
 * so a component reading either directly would put a colour on screen that
 * this file's own bar rejects. Reading them from styles.css to derive an
 * accent is the intended use and is why they exist.
 */
test('nothing paints with a raw source colour', () => {
  const styles = readFileSync(join(import.meta.dir, '..', 'styles.css'), 'utf8')
  for (const token of ['--color-brand-blue', '--color-brand-pink']) {
    expect(styles).toContain(`${token}:`)
  }

  const app = join(import.meta.dir, '..')
  // `scanSync` yields a generator, which has no `filter`; spreading it
  // first is what makes this an array rather than an empty object.
  const offenders = [
    ...new Bun.Glob('**/*.{ts,tsx,css}').scanSync({ cwd: app, absolute: true }),
  ]
    .filter((file) => !file.endsWith('styles.css'))
    .filter((file) => !file.endsWith('contrast.test.ts'))
    .filter((file) => {
      const body = readFileSync(file, 'utf8')
      return body.includes('brand-blue') || body.includes('brand-pink')
    })
  expect(offenders).toEqual([])
})

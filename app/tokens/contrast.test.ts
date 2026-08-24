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
    const brand = [
      hex(theme, '--color-accent-from'),
      hex(theme, '--color-accent-to'),
    ]
    for (const token of CHART) {
      for (const stop of brand) {
        expect(separation(hex(theme, token), stop)).toBeGreaterThan(15)
      }
    }
  })
}

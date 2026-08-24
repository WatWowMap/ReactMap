/*
 * WCAG contrast and colour-vision maths for the design tokens.
 *
 * Nothing else in this repo can see a colour. The audit that preceded the
 * component install found an active navigation item at 3.82:1 and a button
 * hover at 2.27:1, and both had passed typecheck, lint, a clean build and
 * the whole test suite. A ratio is only ever checked if something computes
 * it, so this module exists to be called from contrast.test.ts.
 */

type Triple = [number, number, number]

const hexToRgb = (hex: string): Triple => {
  const body = hex.replace('#', '')
  const full =
    body.length === 3
      ? body
          .split('')
          .map((char) => char + char)
          .join('')
      : body
  const value = Number.parseInt(full.slice(0, 6), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

const toLinear = (channel: number) => {
  const ratio = channel / 255
  return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
}

const linearize = (rgb: Triple): Triple => [
  toLinear(rgb[0]),
  toLinear(rgb[1]),
  toLinear(rgb[2]),
]

const luminance = (rgb: Triple) => {
  const [r, g, b] = linearize(rgb)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.1 relative contrast, 1 to 21. Order of arguments does not matter. */
export const contrast = (a: string, b: string) => {
  const first = luminance(hexToRgb(a))
  const second = luminance(hexToRgb(b))
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

/*
 * Vienot, Brettel and Mollon (1999) dichromat simulation, applied in linear
 * RGB. Used only to ask whether two data series stay apart, never to choose
 * a colour.
 */
const DICHROMAT = {
  protanopia: [0.11238, 0.88762, 0, 0.11238, 0.88762, 0, 0, 0, 1],
  deuteranopia: [0.29275, 0.70725, 0, 0.29275, 0.70725, 0, 0, 0, 1],
  tritanopia: [1, 0, 0, 0, 1, 0, -0.02524, 0.29307, 0.73217],
} satisfies Record<string, number[]>

export type Dichromacy = keyof typeof DICHROMAT

const encode = (channel: number) => {
  const clamped = Math.min(1, Math.max(0, channel))
  const srgb =
    clamped <= 0.0031308
      ? clamped * 12.92
      : 1.055 * clamped ** (1 / 2.4) - 0.055
  return Math.round(srgb * 255)
}

const simulate = (rgb: Triple, kind: Dichromacy): Triple => {
  const [r, g, b] = linearize(rgb)
  const m = DICHROMAT[kind] as number[]
  const at = (index: number) => m[index] as number
  return [
    encode(at(0) * r + at(1) * g + at(2) * b),
    encode(at(3) * r + at(4) * g + at(5) * b),
    encode(at(6) * r + at(7) * g + at(8) * b),
  ]
}

const toLab = (rgb: Triple): Triple => {
  const [r, g, b] = linearize(rgb)
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

const deltaE = (a: Triple, b: Triple) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

/**
 * Smallest CIE76 difference between two colours across normal vision and the
 * three dichromacies. Higher is further apart for more people.
 */
export const separation = (a: string, b: string) => {
  const first = hexToRgb(a)
  const second = hexToRgb(b)
  const kinds: Dichromacy[] = ['protanopia', 'deuteranopia', 'tritanopia']
  return kinds.reduce(
    (worst, kind) =>
      Math.min(
        worst,
        deltaE(toLab(simulate(first, kind)), toLab(simulate(second, kind))),
      ),
    deltaE(toLab(first), toLab(second)),
  )
}

/**
 * Reads the literal hex behind every token in a stylesheet, following one or
 * more var() aliases, for a given theme. Everything before the
 * prefers-color-scheme block is the light theme; the block itself overrides
 * it for dark.
 */
export const readTokens = (sources: string[], theme: 'light' | 'dark') => {
  const raw = new Map<string, string>()
  for (const source of sources) {
    const [light = '', ...rest] = source.split(
      '@media (prefers-color-scheme: dark)',
    )
    const scopes = theme === 'dark' ? [light, ...rest] : [light]
    for (const scope of scopes) {
      for (const match of scope.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
        const name = match[1]
        const value = match[2]
        if (name !== undefined && value !== undefined)
          raw.set(name, value.trim())
      }
    }
  }

  const resolve = (
    name: string,
    seen = new Set<string>(),
  ): string | undefined => {
    if (seen.has(name)) return undefined
    seen.add(name)
    const value = raw.get(name)
    if (value === undefined) return undefined
    if (value.startsWith('#')) return value
    const alias = /^var\((--[\w-]+)\)$/.exec(value)
    return alias?.[1] === undefined ? undefined : resolve(alias[1], seen)
  }

  const resolved = new Map<string, string>()
  for (const name of raw.keys()) {
    const hex = resolve(name)
    if (hex !== undefined) resolved.set(name, hex)
  }
  return resolved
}

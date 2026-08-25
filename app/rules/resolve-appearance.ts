/**
 * Turns the rule ids the server says matched one entity (`entity.matched`,
 * stamped by `map-subscription.ts`) into the display properties a marker
 * actually draws. This is resolution, not evaluation: deciding whether a
 * Pokemon satisfies an IV range or a PvP rank never leaves the server
 * (`server/src/services/rule-local-filter.ts`); every line here only
 * combines rules that have already won.
 *
 * Call this per entity, in the component that draws (`map-canvas.tsx`/
 * `layers.ts`), never in a parent that then prop-drills the result. And
 * never build a new top-level entity array to hold the result -- that is
 * the reference deck.gl re-uploads a layer's buffers for; see
 * `entity-store.ts`'s header comment.
 */

import type { Rule } from './rule-types'

/**
 * The vocabulary of `rule.size`, in ascending order. One exported
 * constant, used everywhere a size needs comparing, so "xl" means the
 * same thing on a marker as it does in the sheet.
 */
export const SIZE_ORDER = ['sm', 'md', 'lg', 'xl'] as const

export type SizeName = (typeof SIZE_ORDER)[number]

function isSizeName(value: string | null): value is SizeName {
  return value !== null && (SIZE_ORDER as readonly string[]).includes(value)
}

/** The larger of two sizes. An unrecognised or absent `next` leaves `current` unchanged. */
export function maxSize(current: SizeName, next: string | null): SizeName {
  if (!isSizeName(next)) return current
  return SIZE_ORDER.indexOf(next) > SIZE_ORDER.indexOf(current) ? next : current
}

export interface Appearance {
  size: SizeName
  /** One entry per matching rule with a glow set, in `matched` order. Never merged or averaged. */
  rings: string[]
  notify: boolean
}

/**
 * Combines every rule that matched one entity into what it draws as. Size
 * takes the maximum across matches, every glow contributes its own ring
 * segment (the marker popup names each ring by the rule that produced
 * it, so they must stay distinct), and notify is an OR: any matching rule
 * that asks to notify wins.
 *
 * A `matched` id with no entry in `rules` -- a rule added on another
 * device, not yet refetched -- is skipped rather than thrown on. See the
 * design spec's Errors section: an entity that still does not resolve
 * after a refetch renders at default appearance. `rules-query.ts`'s
 * staleness check is what keeps the gap short-lived.
 */
export function resolveAppearance(
  matched: number[],
  rules: ReadonlyMap<number, Rule>,
): Appearance {
  const hit = matched
    .map((id) => rules.get(id))
    .filter((rule): rule is Rule => rule !== undefined)

  return {
    size: hit.reduce<SizeName>(
      (biggest, rule) => maxSize(biggest, rule.size),
      'md',
    ),
    rings: hit
      .map((rule) => rule.glow)
      .filter((glow): glow is string => Boolean(glow)),
    notify: hit.some((rule) => rule.notify),
  }
}

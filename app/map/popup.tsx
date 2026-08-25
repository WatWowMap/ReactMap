import { Button } from '@app/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@app/components/ui/card'
import { XIcon } from 'lucide-react'
import { resolveAppearance } from '../rules/resolve-appearance'
import type { Rule } from '../rules/rule-types'
import { formatCountdown } from './layers'
import type { MapEntity } from './types'

export interface PopupProps {
  /** The entity this popup describes. Exactly one of these exists at a time. */
  entity: MapEntity
  /**
   * Where `entity`'s coordinate currently projects to, in pixels relative
   * to the map container. Owned by `useMapLibre`, which recomputes it on
   * every camera frame; this component only ever reads a position, it
   * never computes one. See task-5-report.md for why.
   */
  x: number
  y: number
  onClose: () => void
  /** Clock the countdown reads against. Defaults to the real time; tests
   * pin this to get a deterministic countdown string. */
  now?: number
  /**
   * `id -> Rule`, the same map `useRules` returns. Optional so every
   * existing caller of this component keeps working unchanged; a caller
   * that supplies it gets the "why" lines below the entity's own facts.
   * Not fetched here -- `entity.matched` already carries the ids that won
   * (see `resolve-appearance.ts`), so naming them costs only this lookup.
   */
  rules?: ReadonlyMap<number, Rule>
}

function titleFor(entity: MapEntity): string {
  return entity.kind === 'pokemon'
    ? `Pokemon #${entity.pokemonId}`
    : `Gym${entity.inBattle ? ' (in battle)' : ''}`
}

/** `resolveAppearance`'s size vocabulary, as the word a person reads. */
const SIZE_LABEL: Record<string, string> = {
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
  xl: 'Extra large',
}

/**
 * The small, fixed set of ring colours this plan's mockups use. A glow
 * outside this set still renders -- as its own hex string -- rather than
 * being dropped, since an unnamed colour is still worth telling someone
 * about.
 */
const GLOW_NAME: Record<string, string> = {
  '#ffc83d': 'Gold',
  '#4f8cff': 'Blue',
}

function glowName(hex: string): string {
  return GLOW_NAME[hex.toLowerCase()] ?? hex
}

/**
 * The marker popup's "why", one line per fact: what size this rendered
 * as and which rule asked for it, one line per ring and the rule that
 * contributed it, and whether this notifies -- always stated, since the
 * negative case ("no matching rule asks to") is the only place someone
 * finds out why an alert never came. Named from the rule ids already on
 * `entity.matched`, so this costs nothing beyond the `rules` lookup
 * `resolveAppearance` also reads -- see that module's header for why
 * evaluation itself never happens here.
 */
function appearanceLines(
  matched: number[],
  rules: ReadonlyMap<number, Rule>,
): string[] {
  const hit = matched
    .map((id) => rules.get(id))
    .filter((rule): rule is Rule => rule !== undefined)
  const appearance = resolveAppearance(matched, rules)
  const lines: string[] = []

  const sizeRule = hit.find((rule) => rule.size === appearance.size)
  if (sizeRule) {
    lines.push(
      `${SIZE_LABEL[appearance.size]} because ${sizeRule.name} matched.`,
    )
  }

  for (const rule of hit) {
    if (rule.glow) lines.push(`${glowName(rule.glow)} ring from ${rule.name}.`)
  }

  const notifyRule = hit.find((rule) => rule.notify)
  lines.push(
    notifyRule
      ? `Notifying, because ${notifyRule.name} asks to.`
      : 'Not notifying, because no matching rule asks to.',
  )

  return lines
}

/**
 * The one popup this map ever shows. Positioned with a plain absolute
 * offset rather than through the `Popover` primitive's own floating-ui
 * placement: `Popover`'s auto-update tracks its anchor element's DOM rect,
 * but this component's anchor is a data coordinate reprojected by
 * `useMapLibre` on every camera frame, not a DOM element that moves on its
 * own. Driving position from `x`/`y` props keeps this component a pure
 * function of its inputs, which is what makes it testable without a map at
 * all (see Popup.test.tsx). `Card` still supplies the chrome - rounded
 * panel, header, close affordance - so nothing here is hand-built.
 */
export function Popup({
  entity,
  x,
  y,
  onClose,
  now = Date.now(),
  rules,
}: PopupProps) {
  const lines =
    entity.kind === 'pokemon' && rules
      ? appearanceLines(entity.matched ?? [], rules)
      : []

  return (
    <Card
      data-slot="map-popup"
      size="sm"
      className="pointer-events-auto absolute w-56 -translate-x-1/2 -translate-y-full shadow-lg"
      style={{ left: x, top: y - 12 }}
    >
      <CardHeader>
        <CardTitle>{titleFor(entity)}</CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            onClick={onClose}
          >
            <XIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {entity.kind === 'pokemon' ? (
          <CardDescription>
            {entity.iv !== undefined ? `${entity.iv}% IV` : 'IV unknown'}
            {' · '}
            {formatCountdown(entity.expiresAt, now)}
          </CardDescription>
        ) : (
          <CardDescription className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: `var(--color-team-${entity.team ?? 0})`,
              }}
            />
            {entity.team === undefined ? 'Team unknown' : `Team ${entity.team}`}
          </CardDescription>
        )}
        {lines.length > 0 && (
          <CardDescription className="mt-1.5 flex flex-col gap-0.5">
            {lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  )
}

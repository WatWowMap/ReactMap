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
}

function titleFor(entity: MapEntity): string {
  return entity.kind === 'pokemon'
    ? `Pokemon #${entity.pokemonId}`
    : `Gym${entity.inBattle ? ' (in battle)' : ''}`
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
export function Popup({ entity, x, y, onClose, now = Date.now() }: PopupProps) {
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
      </CardContent>
    </Card>
  )
}

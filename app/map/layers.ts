import type { Color, Layer } from '@deck.gl/core'
import { IconLayer, TextLayer } from '@deck.gl/layers'
import type { IconDescriptor } from './atlas'
import type { GymEntity, PokemonEntity, Team } from './types'

export const POKEMON_ICON_LAYER_ID = 'pokemon-icons'
export const POKEMON_LABEL_LAYER_ID = 'pokemon-labels'
export const GYM_ICON_LAYER_ID = 'gym-icons'

/** Fallback for a team colour token that failed to resolve. Neutral grey,
 * distinct from every real team colour, so a broken token is visible on
 * the map rather than invisible in a colourless marker. */
const FALLBACK_TEAM_COLOR: Color = [128, 128, 128, 255]

/**
 * Maps each `Team` value to the custom property carrying its colour in
 * `app/tokens/data-palette.css`. That file's `@theme static` block is what
 * keeps these from being pruned by Tailwind's unused-variable scan; see
 * the comment there for why a scanner can't see this file's usage.
 */
const TEAM_COLOR_TOKEN: Record<Team, string> = {
  0: '--color-team-0',
  1: '--color-team-1',
  2: '--color-team-2',
  3: '--color-team-3',
}

function parseHexColor(value: string): Color | undefined {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim())
  if (!match) return undefined
  const hex = match[1] as string
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
    255,
  ]
}

/**
 * Reads one team's colour from the data palette's CSS custom properties at
 * runtime, rather than importing a colour table, so the map surface and the
 * rest of the design system share one source of truth.
 *
 * A pruned or otherwise unresolved custom property comes back from
 * `getComputedStyle` as an empty string, and nothing about that fails
 * loudly; `getIcon`/`getColor` would just receive nothing and the marker
 * would render without colour. This checks what the property actually
 * resolved to and falls back to a visible neutral grey with a console
 * warning instead of letting that happen silently.
 */
export function readTeamColor(
  team: Team,
  root: HTMLElement = document.documentElement,
): Color {
  const token = TEAM_COLOR_TOKEN[team]
  const raw = getComputedStyle(root).getPropertyValue(token)
  const color = parseHexColor(raw)
  if (!color) {
    // eslint-disable-next-line no-console
    console.warn(
      `[map] team colour token ${token} resolved to ${JSON.stringify(raw)}, expected a #rrggbb value. Falling back to grey.`,
    )
    return FALLBACK_TEAM_COLOR
  }
  return color
}

/**
 * Formats the time remaining until `expiresAt` as `m:ss`, clamped at zero
 * rather than going negative once a fixture (or a real encounter) expires.
 *
 * Takes `now` as a parameter instead of reading `Date.now()` internally so
 * a test can pin a moment and compare against it, and so the caller is the
 * single place that decides how often this gets recomputed (once a second,
 * driven by a timer that rebuilds the layer's data array; see MapCanvas).
 */
export function formatCountdown(expiresAt: number, now: number): string {
  const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000))
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function pokemonLabelText(entity: PokemonEntity, now: number): string {
  const countdown = formatCountdown(entity.expiresAt, now)
  return entity.iv === undefined ? countdown : `${entity.iv}% ${countdown}`
}

/**
 * Markers for every visible pokemon. `getIcon` calls `getIconFor` per
 * entity rather than pre-drawing the whole array: the atlas's own LRU is
 * what keeps that cheap on a hit, and staying entity-in-descriptor-out here
 * keeps this layer ignorant of the drawing/caching machinery entirely.
 */
export function buildPokemonIconLayer(
  pokemon: readonly PokemonEntity[],
  getIconFor: (entity: PokemonEntity) => IconDescriptor,
): IconLayer<PokemonEntity> {
  return new IconLayer<PokemonEntity>({
    id: POKEMON_ICON_LAYER_ID,
    data: pokemon,
    pickable: true,
    getPosition: (entity) => [entity.lon, entity.lat],
    getIcon: (entity) => {
      const icon = getIconFor(entity)
      return {
        id: icon.id,
        url: icon.url,
        width: icon.width,
        height: icon.height,
      }
    },
    getSize: 32,
  })
}

/**
 * Countdown (and, when present, IV) text for every visible pokemon. This is
 * plain layer data: one `TextLayer` covering the whole array, rebuilt with
 * a fresh `now` once a second by the caller. A `TextLayer` diffs its data
 * array itself and only touches the instances whose text actually changed,
 * which is the entire reason this exists instead of a per-marker timer
 * component - thousands of those is exactly the pattern this rewrite
 * replaces.
 */
export function buildPokemonTextLayer(
  pokemon: readonly PokemonEntity[],
  now: number,
): TextLayer<PokemonEntity> {
  return new TextLayer<PokemonEntity>({
    id: POKEMON_LABEL_LAYER_ID,
    data: pokemon,
    pickable: false,
    getPosition: (entity) => [entity.lon, entity.lat],
    getText: (entity) => pokemonLabelText(entity, now),
    getSize: 12,
    getPixelOffset: [0, 20],
    background: true,
    getBackgroundColor: [0, 0, 0, 140],
  })
}

/**
 * Markers for every visible gym. `getGymIcon` supplies one shared mask
 * icon (a gym has no per-entity appearance the way a pokemon does, so
 * there is nothing here for Task 2's atlas to key on); `getColor` tints
 * that mask per gym from `readTeamColor`, which is what actually carries
 * the team's meaning.
 */
export function buildGymIconLayer(
  gyms: readonly GymEntity[],
  getGymIcon: () => IconDescriptor,
  root?: HTMLElement,
): IconLayer<GymEntity> {
  return new IconLayer<GymEntity>({
    id: GYM_ICON_LAYER_ID,
    data: gyms,
    pickable: true,
    getPosition: (entity) => [entity.lon, entity.lat],
    getIcon: () => {
      const icon = getGymIcon()
      return {
        id: icon.id,
        url: icon.url,
        width: icon.width,
        height: icon.height,
        mask: true,
      }
    },
    getColor: (entity) => readTeamColor(entity.team, root),
    getSize: 28,
  })
}

export interface BuildMapLayersOptions {
  pokemon: readonly PokemonEntity[]
  gyms: readonly GymEntity[]
  getIconFor: (entity: PokemonEntity) => IconDescriptor
  getGymIcon: () => IconDescriptor
  now: number
  root?: HTMLElement
}

/**
 * All layers this task adds, in the order deck.gl should draw them: gyms
 * and pokemon icons first, pokemon labels last so text always sits on top
 * of the markers it describes. Draw order between layers is independent of
 * `interleaved`, which only controls where the whole deck.gl stack sits
 * relative to MapLibre's own street-label layer.
 */
export function buildMapLayers({
  pokemon,
  gyms,
  getIconFor,
  getGymIcon,
  now,
  root,
}: BuildMapLayersOptions): Layer[] {
  return [
    buildGymIconLayer(gyms, getGymIcon, root),
    buildPokemonIconLayer(pokemon, getIconFor),
    buildPokemonTextLayer(pokemon, now),
  ]
}

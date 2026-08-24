import type { Color, Layer } from '@deck.gl/core'
import { IconLayer, TextLayer } from '@deck.gl/layers'
import type { IconDescriptor } from './atlas'
import {
  type ClusterMarker,
  type ClusterRules,
  clusterEntities,
  DEFAULT_GYM_CLUSTER_RULES,
  DEFAULT_POKEMON_CLUSTER_RULES,
} from './clustering'
import type { GymEntity, PokemonEntity, Team, Viewport } from './types'

export const POKEMON_ICON_LAYER_ID = 'pokemon-icons'
export const POKEMON_LABEL_LAYER_ID = 'pokemon-labels'
export const GYM_ICON_LAYER_ID = 'gym-icons'
export const POKEMON_CLUSTER_ICON_LAYER_ID = 'pokemon-cluster-icons'
export const POKEMON_CLUSTER_LABEL_LAYER_ID = 'pokemon-cluster-labels'
export const GYM_CLUSTER_ICON_LAYER_ID = 'gym-cluster-icons'
export const GYM_CLUSTER_LABEL_LAYER_ID = 'gym-cluster-labels'

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

/**
 * How opaque a cluster bubble is painted. Not a token: this is the bubble's
 * material, letting a little of the basemap through so a cluster does not
 * read as a hole punched in the map, and it is the same for every bucket.
 * The colour tokens carry the meaning; this carries none.
 */
const CLUSTER_ALPHA = 230

/**
 * Buckets a cluster by how many entities it stands in for, same three-tier
 * split as 1.0's `marker-cluster-{small,medium,large}` CSS classes
 * (`Clustering.jsx`'s `createClusterIcon`): a cluster of a few dozen reads
 * very differently from one standing in for a thousand entities, and the
 * colour is the only signal of that at a glance.
 */
function clusterColorToken(count: number): string {
  if (count < 100) return '--color-cluster-small'
  if (count < 1000) return '--color-cluster-medium'
  return '--color-cluster-large'
}

/**
 * Reads a cluster bubble's fill from the data palette, the same way
 * `readTeamColor` reads a team's, and for the same reason: map entity
 * colours live in `app/tokens/data-palette.css` and nowhere else. Same
 * unresolved-token fallback too, since a pruned custom property fails
 * silently rather than loudly.
 */
export function readClusterColor(
  count: number,
  root: HTMLElement = document.documentElement,
): Color {
  const token = clusterColorToken(count)
  const raw = getComputedStyle(root).getPropertyValue(token)
  const color = parseHexColor(raw)
  if (!color) {
    console.warn(
      `[map] cluster colour token ${token} resolved to ${JSON.stringify(raw)}, expected a #rrggbb value. Falling back to grey.`,
    )
    return [
      FALLBACK_TEAM_COLOR[0],
      FALLBACK_TEAM_COLOR[1],
      FALLBACK_TEAM_COLOR[2],
      CLUSTER_ALPHA,
    ]
  }
  return [color[0], color[1], color[2], CLUSTER_ALPHA]
}

/** The count drawn on a bubble, read from the same palette as the fill. */
export function readClusterLabelColor(
  root: HTMLElement = document.documentElement,
): Color {
  const raw = getComputedStyle(root).getPropertyValue('--color-cluster-label')
  const color = parseHexColor(raw)
  if (!color) {
    console.warn(
      `[map] cluster label colour token --color-cluster-label resolved to ${JSON.stringify(raw)}, expected a #rrggbb value. Falling back to grey.`,
    )
    return FALLBACK_TEAM_COLOR
  }
  return color
}

/**
 * Icon bubble for a set of cluster markers, tinted by `clusterColorFor`.
 * Shared between the pokemon and gym cluster layers; only the layer `id`
 * and the input array differ between them.
 */
export function buildClusterIconLayer(
  clusters: readonly ClusterMarker[],
  id: string,
  getClusterIcon: () => IconDescriptor,
  root?: HTMLElement,
): IconLayer<ClusterMarker> {
  return new IconLayer<ClusterMarker>({
    id,
    data: clusters,
    pickable: false,
    getPosition: (cluster) => [cluster.lon, cluster.lat],
    getIcon: () => {
      const icon = getClusterIcon()
      return {
        id: icon.id,
        url: icon.url,
        width: icon.width,
        height: icon.height,
        mask: true,
      }
    },
    getColor: (cluster) => readClusterColor(cluster.count, root),
    getSize: 36,
  })
}

/** The entity count centred on each cluster bubble. */
export function buildClusterTextLayer(
  clusters: readonly ClusterMarker[],
  id: string,
  root?: HTMLElement,
): TextLayer<ClusterMarker> {
  return new TextLayer<ClusterMarker>({
    id,
    data: clusters,
    pickable: false,
    getPosition: (cluster) => [cluster.lon, cluster.lat],
    getText: (cluster) => String(cluster.count),
    getSize: 13,
    getColor: readClusterLabelColor(root),
  })
}

export interface BuildMapLayersOptions {
  pokemon: readonly PokemonEntity[]
  gyms: readonly GymEntity[]
  getIconFor: (entity: PokemonEntity) => IconDescriptor
  getGymIcon: () => IconDescriptor
  now: number
  root?: HTMLElement
  /**
   * The current camera bounds/zoom. When present, `buildMapLayers` clusters
   * pokemon and gyms for that viewport and enforces each category's
   * `forcedLimit` (see clustering.ts) - the fix for the bug traced in the
   * task brief, where 1.0's limit stopped applying above its clusterer's
   * `maxZoom`. Omitted, every entity renders individually as before; this
   * keeps every existing caller (and layers.test.ts) working unchanged.
   */
  viewport?: Viewport
  /** Per-category override of the default rules read from `config/default.json`. */
  clusterRules?: { pokemon?: ClusterRules; gyms?: ClusterRules }
  getClusterIcon?: () => IconDescriptor
}

/**
 * All layers this task adds, in the order deck.gl should draw them: gyms
 * and pokemon icons first, pokemon labels last so text always sits on top
 * of the markers it describes. Draw order between layers is independent of
 * `interleaved`, which only controls where the whole deck.gl stack sits
 * relative to MapLibre's own street-label layer.
 */
interface ClusteredEntities<T> {
  points: readonly T[]
  clusters: readonly ClusterMarker[]
  /** Carried straight out of `clusterEntities`; see `MapLayersResult`. */
  limitHit: boolean
}

function clusterPokemon(
  pokemon: readonly PokemonEntity[],
  viewport: Viewport,
  rules: ClusterRules,
): ClusteredEntities<PokemonEntity> {
  const wrapped = pokemon.map((entity) => ({
    id: entity.spawnId,
    lat: entity.lat,
    lon: entity.lon,
    entity,
  }))
  const result = clusterEntities(wrapped, viewport.bounds, viewport.zoom, rules)
  return {
    points: result.points.map((wrapper) => wrapper.entity),
    clusters: result.clusters,
    limitHit: result.limitHit,
  }
}

function clusterGyms(
  gyms: readonly GymEntity[],
  viewport: Viewport,
  rules: ClusterRules,
): ClusteredEntities<GymEntity> {
  const wrapped = gyms.map((entity) => ({
    id: entity.gymId,
    lat: entity.lat,
    lon: entity.lon,
    entity,
  }))
  const result = clusterEntities(wrapped, viewport.bounds, viewport.zoom, rules)
  return {
    points: result.points.map((wrapper) => wrapper.entity),
    clusters: result.clusters,
    limitHit: result.limitHit,
  }
}

/**
 * Whether each category's `forcedLimit` engaged for the frame just built.
 *
 * This exists because a capped map and a genuinely empty area are pixel for
 * pixel identical: the user has no way to tell "there is nothing here" from
 * "there is too much here to draw and some of it has been merged away". The
 * flag `clusterEntities` computes has to survive the trip out to something
 * that can say so, which means `buildMapLayers` cannot return a bare array.
 *
 * Both are false when no `viewport` is given, since nothing was clustered and
 * nothing was capped.
 */
export interface LimitHit {
  pokemon: boolean
  gyms: boolean
}

export interface MapLayersResult {
  layers: Layer[]
  limitHit: LimitHit
}

const NOTHING_CAPPED: LimitHit = { pokemon: false, gyms: false }

/**
 * All layers this task adds, in the order deck.gl should draw them: gyms
 * and pokemon icons first, pokemon labels last so text always sits on top
 * of the markers it describes. Draw order between layers is independent of
 * `interleaved`, which only controls where the whole deck.gl stack sits
 * relative to MapLibre's own street-label layer.
 *
 * Without `viewport`, every entity renders individually - the original
 * Task 4 behaviour, still what layers.test.ts exercises. With `viewport`,
 * pokemon and gyms are each clustered and capped against their
 * `forcedLimit` (clustering.ts; see clustering.test.ts for the bug this
 * closes) before their icon/text layers are built, and any resulting
 * cluster bubbles are added as their own layers when `getClusterIcon` is
 * supplied.
 *
 * Returns the layers alongside a per-category `limitHit`, rather than a bare
 * array, so a caller can tell the user the view is capped. See `LimitHit`.
 */
export function buildMapLayers({
  pokemon,
  gyms,
  getIconFor,
  getGymIcon,
  now,
  root,
  viewport,
  clusterRules,
  getClusterIcon,
}: BuildMapLayersOptions): MapLayersResult {
  if (!viewport) {
    return {
      layers: [
        buildGymIconLayer(gyms, getGymIcon, root),
        buildPokemonIconLayer(pokemon, getIconFor),
        buildPokemonTextLayer(pokemon, now),
      ],
      limitHit: NOTHING_CAPPED,
    }
  }

  const pokemonResult = clusterPokemon(
    pokemon,
    viewport,
    clusterRules?.pokemon ?? DEFAULT_POKEMON_CLUSTER_RULES,
  )
  const gymResult = clusterGyms(
    gyms,
    viewport,
    clusterRules?.gyms ?? DEFAULT_GYM_CLUSTER_RULES,
  )

  const layers: Layer[] = [
    buildGymIconLayer(gymResult.points, getGymIcon, root),
    buildPokemonIconLayer(pokemonResult.points, getIconFor),
    buildPokemonTextLayer(pokemonResult.points, now),
  ]

  if (getClusterIcon) {
    if (gymResult.clusters.length > 0) {
      layers.push(
        buildClusterIconLayer(
          gymResult.clusters,
          GYM_CLUSTER_ICON_LAYER_ID,
          getClusterIcon,
          root,
        ),
        buildClusterTextLayer(
          gymResult.clusters,
          GYM_CLUSTER_LABEL_LAYER_ID,
          root,
        ),
      )
    }
    if (pokemonResult.clusters.length > 0) {
      layers.push(
        buildClusterIconLayer(
          pokemonResult.clusters,
          POKEMON_CLUSTER_ICON_LAYER_ID,
          getClusterIcon,
          root,
        ),
        buildClusterTextLayer(
          pokemonResult.clusters,
          POKEMON_CLUSTER_LABEL_LAYER_ID,
          root,
        ),
      )
    }
  }

  return {
    layers,
    limitHit: { pokemon: pokemonResult.limitHit, gyms: gymResult.limitHit },
  }
}

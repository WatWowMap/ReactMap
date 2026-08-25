import type { Color, Layer } from '@deck.gl/core'
import { IconLayer, TextLayer } from '@deck.gl/layers'
import { resolveAppearance, type SIZE_ORDER } from '../rules/resolve-appearance'
import type { Rule } from '../rules/rule-types'
import type { IconDescriptor } from './atlas'
import {
  type ClusterMarker,
  type ClusterRules,
  clusterEntities,
  DEFAULT_GYM_CLUSTER_RULES,
  DEFAULT_POKEMON_CLUSTER_RULES,
} from './clustering'
import { RING_SIZE_SCALE } from './ring-icon'
import type { GymEntity, PokemonEntity, Team, Viewport } from './types'

/** No rule matched anything: every entity resolves to `resolveAppearance`'s
 * own defaults. One shared instance, not a fresh `new Map()` per call --
 * `buildMapLayers` runs on every clock tick (see MapCanvas), and an empty
 * map costs nothing to share. */
const NO_RULES: ReadonlyMap<number, Rule> = new Map()

/** `rule.size` in pixels, as the height deck.gl scales a sprite to.
 *
 * `'md'` is the neutral default and is deliberately what an unresolved
 * marker drew at before rules existed, so a pokemon nothing matched (or a
 * subscription with no rules source at all) looks exactly as it always
 * did. The steps are 8px apart rather than a ratio: an 8px difference is
 * the smallest one that reads at a glance on a crowded map, and a
 * multiplicative ladder from 24 would put `xl` near 80px, which at
 * downtown density covers its own neighbours. `sm` stops at 24 because
 * below that a sprite's silhouette stops being recognisable, which defeats
 * the point of real artwork. */
const SIZE_PIXELS: Record<(typeof SIZE_ORDER)[number], number> = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 48,
}

export const POKEMON_RING_LAYER_ID = 'pokemon-rings'
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
 *
 * `getSize` runs `resolveAppearance` per entity, inside the accessor deck.gl
 * itself calls to build the size attribute -- never over `pokemon` up front
 * into a second array. `rules` is read fresh on every call rather than
 * closed over once, for the same reason `data` here is the array
 * `entity-store.ts` already keeps stable: this function must not allocate
 * anything deck.gl would see as a new top-level reference.
 */
export function buildPokemonIconLayer(
  pokemon: readonly PokemonEntity[],
  getIconFor: (entity: PokemonEntity) => IconDescriptor,
  rules: ReadonlyMap<number, Rule> = NO_RULES,
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
    getSize: (entity) =>
      SIZE_PIXELS[resolveAppearance(entity.matched ?? [], rules).size],
  })
}

/**
 * The glow rings, as their own layer drawn UNDER the species sprites.
 *
 * Keeping them separate is the load-bearing performance decision here.
 * `iconKeyFor` already keys the sprite atlas on seven appearance fields;
 * compositing a ring into that art would multiply all of it by every
 * colour combination a profile's rules can produce, and re-key the lot on
 * every rule edit. Keyed on the colours alone (`ringKeyFor`), this atlas is
 * a few dozen entries and never grows with what is on screen.
 *
 * `data` is the glowing subset rather than the whole array, so deck.gl
 * uploads one instance per ring instead of one per pokemon with most of
 * them invisible. That filter allocates - which is fine precisely because
 * this is called from the clustering memo, not from the once-a-second
 * clock tick (see MapCanvas); it runs when the entity set or the rules
 * actually changed, and never on a tick.
 */
export function buildPokemonRingLayer(
  pokemon: readonly PokemonEntity[],
  getRingIcon: (rings: readonly string[]) => IconDescriptor,
  rules: ReadonlyMap<number, Rule> = NO_RULES,
): IconLayer<PokemonEntity> {
  const glowing = pokemon.filter(
    (entity) => resolveAppearance(entity.matched ?? [], rules).rings.length > 0,
  )
  return new IconLayer<PokemonEntity>({
    id: POKEMON_RING_LAYER_ID,
    data: glowing,
    // The sprite on top is what a click is meant to land on; a ring that
    // was pickable would swallow picks in the margin around the artwork
    // and report the same entity twice.
    pickable: false,
    getPosition: (entity) => [entity.lon, entity.lat],
    getIcon: (entity) => {
      const icon = getRingIcon(
        resolveAppearance(entity.matched ?? [], rules).rings,
      )
      return {
        id: icon.id,
        url: icon.url,
        width: icon.width,
        height: icon.height,
      }
    },
    getSize: (entity) =>
      SIZE_PIXELS[resolveAppearance(entity.matched ?? [], rules).size] *
      RING_SIZE_SCALE,
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
    // A gym whose team nobody has told us yet is drawn uncontested. That
    // is a rendering fallback, not a stored value: the store leaves the
    // field absent until a message actually carries it (see GymEntity).
    getColor: (entity) => readTeamColor(entity.team ?? 0, root),
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
  /**
   * Draws (or serves from cache) the ring icon for one colour combination.
   * Omitted, no ring layer is built at all -- which is what every caller
   * that predates rings, layers.test.ts included, gets.
   */
  getRingIcon?: (rings: readonly string[]) => IconDescriptor
  /**
   * The signed-in profile's rules (`app/rules/rules-query.ts`'s
   * `useRules`), read by `buildPokemonIconLayer` to size each marker from
   * what matched it. Omitted, every pokemon draws at the pre-rules
   * default -- `NO_RULES` above.
   */
  rules?: ReadonlyMap<number, Rule>
}

/**
 * All layers this task adds, in the order deck.gl should draw them: gyms
 * first, then glow rings, then the pokemon sprites that sit on top of
 * them, and pokemon labels last so text always sits above the markers it
 * describes. Draw order between layers is independent of
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
  /**
   * The pokemon actually rendered after clustering, so a caller can rebuild
   * just the countdown text on a tick instead of re-running the clustering.
   * Building a Supercluster index over every subscribed entity once a second
   * is what this exists to avoid.
   */
  renderedPokemon: readonly PokemonEntity[]

  layers: Layer[]
  limitHit: LimitHit
}

const NOTHING_CAPPED: LimitHit = { pokemon: false, gyms: false }

/**
 * All layers this task adds, in the order deck.gl should draw them: gyms
 * first, then glow rings, then the pokemon sprites that sit on top of
 * them, and pokemon labels last so text always sits above the markers it
 * describes. Draw order between layers is independent of
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
  getRingIcon,
  rules,
}: BuildMapLayersOptions): MapLayersResult {
  if (!viewport) {
    return {
      layers: [
        buildGymIconLayer(gyms, getGymIcon, root),
        ...(getRingIcon
          ? [buildPokemonRingLayer(pokemon, getRingIcon, rules)]
          : []),
        buildPokemonIconLayer(pokemon, getIconFor, rules),
        buildPokemonTextLayer(pokemon, now),
      ],
      limitHit: NOTHING_CAPPED,
      renderedPokemon: pokemon,
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
    ...(getRingIcon
      ? [buildPokemonRingLayer(pokemonResult.points, getRingIcon, rules)]
      : []),
    buildPokemonIconLayer(pokemonResult.points, getIconFor, rules),
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
    renderedPokemon: pokemonResult.points,
  }
}

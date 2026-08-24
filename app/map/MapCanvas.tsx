import 'maplibre-gl/dist/maplibre-gl.css'

import type { PickingInfo } from '@deck.gl/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createAtlas } from './atlas'
import {
  drawClusterIcon,
  drawGymIcon,
  drawPokemonIcon,
  resetSharedIconCaches,
} from './draw-icon'
import { FIXTURE_EPOCH } from './fixtures'
import type { MapLayersResult } from './layers'
import {
  buildMapLayers,
  buildPokemonTextLayer,
  POKEMON_LABEL_LAYER_ID,
} from './layers'
import { Popup } from './Popup'
import { createFixtureSource } from './source'
import type {
  GymEntity,
  MapEntity,
  MapQuery,
  PokemonEntity,
  Viewport,
} from './types'
import { useDismissOnEscape } from './useDismissOnEscape'
import type { Camera } from './useMapLibre'
import { anchorFor, pickedEntityFrom, useMapLibre } from './useMapLibre'
import { useWebglContextRecovery } from './useWebglContextRecovery'

export interface MapCanvasProps {
  initialCamera: Camera
  onCameraChange?: (camera: Camera) => void
}

/**
 * A source with no live transport yet has no notion of "the current
 * viewport", so this queries the whole world rather than the camera's
 * bounds; a later task narrows this to what `useMapLibre`'s camera state
 * actually frames.
 */
const WORLD_BOUNDS = { west: -180, south: -90, east: 180, north: 90 }
const POKEMON_QUERY: MapQuery = {
  kind: 'pokemon',
  bounds: WORLD_BOUNDS,
  zoom: 12,
}
const GYM_QUERY: MapQuery = { kind: 'gym', bounds: WORLD_BOUNDS, zoom: 12 }

function isPokemon(entity: MapEntity): entity is PokemonEntity {
  return entity.kind === 'pokemon'
}

function isGym(entity: MapEntity): entity is GymEntity {
  return entity.kind === 'gym'
}

/** What the layer memo falls back to before the atlas exists. */
const EMPTY_LAYERS: MapLayersResult = {
  layers: [],
  limitHit: { pokemon: false, gyms: false },
  renderedPokemon: [],
}

/** How often the countdown/IV text layer is rebuilt against a fresh clock. */
const CLOCK_TICK_MS = 1000

/**
 * Mounts one MapLibre instance sized to the viewport minus the bottom nav
 * (`Shell` reserves that with `pb-16`, 4rem, so this container claims the
 * rest of the dynamic viewport height rather than the full 100dvh, or the
 * map would render 4rem taller than what is actually visible above the
 * nav).
 *
 * The stylesheet import above is load-bearing: without it the canvas still
 * renders, which is exactly what makes it easy to miss, but the
 * NavigationControl and attribution end up unstyled and mispositioned.
 */
export function MapCanvas({ initialCamera, onCameraChange }: MapCanvasProps) {
  // Lazy-initialized on the ref directly (a documented React pattern) so
  // the atlas's LRU cache and the fixture source are each created exactly
  // once for the component's lifetime, not rebuilt on every render.
  const atlasRef = useRef<ReturnType<typeof createAtlas> | null>(null)
  if (atlasRef.current === null) {
    atlasRef.current = createAtlas({ draw: drawPokemonIcon })
  }
  const sourceRef = useRef<ReturnType<typeof createFixtureSource> | null>(null)
  if (sourceRef.current === null) {
    sourceRef.current = createFixtureSource()
  }

  const [pokemon, setPokemon] = useState<PokemonEntity[]>([])
  const [gyms, setGyms] = useState<GymEntity[]>([])
  // Countdown/IV text is layer data, not a per-marker component: this is
  // the one clock this whole tree reads, and every timer-bearing layer is
  // rebuilt from it on the same tick rather than each owning its own.
  // Fixture expiries are measured from a fixed epoch so the generator stays
  // reproducible, which means real wall-clock time is long past all of them and
  // every countdown would read 0:00. Running the clock from that epoch instead
  // keeps the fixtures deterministic and the timers live. When a real source
  // replaces the fixtures this becomes Date.now() again.
  const timeOrigin = useRef(Date.now())
  const [now, setNow] = useState(() => FIXTURE_EPOCH)

  // The one selected entity, or none. This is the entire replacement for
  // 1.0's per-marker ref plus useForcePopup/useMarkerTimer: deck.gl's
  // picking reports what is under the cursor, and there is exactly one
  // popup, so one nullable slot is the whole model.
  const [selected, setSelected] = useState<MapEntity | null>(null)

  // Null only until the map mounts and reports its first frame.
  const [viewport, setViewport] = useState<Viewport | null>(null)

  // Bumped on WebGL context restoration purely to force `layers` below to
  // recompute immediately. buildMapLayers already gets fresh Layer
  // instances every clock tick regardless, since `now` is in its deps -
  // this just closes the gap between "context restored" and "next tick"
  // rather than leaving the map blank for up to a second.
  const [rebuildToken, setRebuildToken] = useState(0)

  const handlePick = useCallback((info: PickingInfo) => {
    setSelected(pickedEntityFrom(info))
  }, [])

  const closePopup = useCallback(() => setSelected(null), [])

  // The atlas's cached icons are gone the moment the context that held
  // their composited pixels dies, so restoration re-warms it before
  // forcing the layer rebuild - a rebuild that reused the stale cache
  // would still hand deck.gl icons composited for a context that no
  // longer exists, which task-6-7-brief.md calls out as rendering an
  // empty map with no error.
  const handleContextRestore = useCallback(() => {
    atlasRef.current?.clear()
    // The gym and cluster icons live in module state, not in the atlas, so
    // they need clearing too or the restore reuses dead textures.
    resetSharedIconCaches()
    setRebuildToken((token) => token + 1)
  }, [])

  useDismissOnEscape(selected !== null, closePopup)

  // Recreated only when the selection itself changes, not on every render:
  // useMapLibre's reprojection effect keys off this object's identity, and
  // a fresh object every render would refire it needlessly.
  const anchor = useMemo(() => anchorFor(selected), [selected])

  useEffect(() => {
    const source = sourceRef.current
    if (!source) return undefined
    const unsubscribePokemon = source.subscribe(POKEMON_QUERY, (entities) => {
      setPokemon(entities.filter(isPokemon))
    })
    const unsubscribeGyms = source.subscribe(GYM_QUERY, (entities) => {
      setGyms(entities.filter(isGym))
    })
    return () => {
      unsubscribePokemon()
      unsubscribeGyms()
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(
      () => setNow(FIXTURE_EPOCH + (Date.now() - timeOrigin.current)),
      CLOCK_TICK_MS,
    )
    return () => clearInterval(interval)
  }, [])

  // What the camera frames, reported by useMapLibre on mount and on every
  // moveend. Passing it into buildMapLayers is what makes any of the
  // clustering run at all: without it every entity renders individually and
  // no forcedLimit applies, which is the state task 6 shipped in.
  // Clustering builds a fresh Supercluster index over every subscribed entity,
  // so it must not depend on the clock. It previously sat in one memo with
  // `now`, which ticks every second, meaning the whole set was re-indexed once
  // a second forever whether or not anything moved. Splitting it means the
  // per-second work is rebuilding the text layer's array, which is what the
  // spec asks for, rather than re-clustering thousands of points.
  const clustered = useMemo(() => {
    const atlas = atlasRef.current
    if (!atlas) return null
    return buildMapLayers({
      pokemon,
      gyms,
      getIconFor: atlas.getIconFor,
      getGymIcon: drawGymIcon,
      getClusterIcon: drawClusterIcon,
      // Any value: the text layer this produces is replaced on every tick.
      now: 0,
      ...(viewport ? { viewport } : {}),
    })
    // rebuildToken is intentionally in this array with no other purpose
    // than to invalidate this memo; see handleContextRestore above.
  }, [pokemon, gyms, viewport, rebuildToken])

  const built = useMemo(() => {
    const atlas = atlasRef.current
    if (!atlas || !clustered) return EMPTY_LAYERS
    // Only the text layer reads the clock, so only it is rebuilt on a tick.
    return {
      layers: clustered.layers.map((layer) =>
        layer.id === POKEMON_LABEL_LAYER_ID
          ? buildPokemonTextLayer(clustered.renderedPokemon, now)
          : layer,
      ),
      limitHit: clustered.limitHit,
    }
  }, [clustered, now])
  const layers = built.layers
  const capped = built.limitHit.pokemon || built.limitHit.gyms

  const { containerRef, screenPosition } = useMapLibre({
    initialCamera,
    ...(onCameraChange ? { onCameraChange } : {}),
    layers,
    onPick: handlePick,
    anchor,
    onViewportChange: setViewport,
  })

  const { restoring } = useWebglContextRecovery(containerRef, {
    onRestore: handleContextRestore,
  })

  return (
    <div
      className="relative h-[calc(100dvh-4rem)] w-full"
      role="application"
      aria-label="Map"
    >
      <div ref={containerRef} className="h-full w-full" />
      {restoring && (
        <div
          role="status"
          className="absolute inset-0 flex items-center justify-center bg-black/60 text-white"
        >
          Restoring map…
        </div>
      )}
      {capped && !restoring && (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-0 top-2 mx-auto w-fit rounded-md bg-black/70 px-3 py-1 text-sm text-white"
        >
          Too much to draw here. Zoom in for detail.
        </div>
      )}
      {selected && screenPosition && (
        <Popup
          entity={selected}
          x={screenPosition.x}
          y={screenPosition.y}
          onClose={closePopup}
        />
      )}
    </div>
  )
}

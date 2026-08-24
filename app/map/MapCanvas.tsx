import 'maplibre-gl/dist/maplibre-gl.css'

import type { PickingInfo } from '@deck.gl/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createAtlas } from './atlas'
import { drawGymIcon, drawPokemonIcon } from './draw-icon'
import type { MapLayersResult } from './layers'
import { buildMapLayers } from './layers'
import { Popup } from './Popup'
import { createFixtureSource } from './source'
import type { GymEntity, MapEntity, MapQuery, PokemonEntity } from './types'
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
  const [now, setNow] = useState(() => Date.now())

  // The one selected entity, or none. This is the entire replacement for
  // 1.0's per-marker ref plus useForcePopup/useMarkerTimer: deck.gl's
  // picking reports what is under the cursor, and there is exactly one
  // popup, so one nullable slot is the whole model.
  const [selected, setSelected] = useState<MapEntity | null>(null)

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
    const interval = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)
    return () => clearInterval(interval)
  }, [])

  const built = useMemo(() => {
    const atlas = atlasRef.current
    if (!atlas) return EMPTY_LAYERS
    return buildMapLayers({
      pokemon,
      gyms,
      getIconFor: atlas.getIconFor,
      getGymIcon: drawGymIcon,
      now,
    })
    // rebuildToken is intentionally in this array with no other purpose
    // than to invalidate this memo; see handleContextRestore above.
  }, [pokemon, gyms, now, rebuildToken])
  const layers = built.layers

  const { containerRef, screenPosition } = useMapLibre({
    initialCamera,
    ...(onCameraChange ? { onCameraChange } : {}),
    layers,
    onPick: handlePick,
    anchor,
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

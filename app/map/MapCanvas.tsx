import 'maplibre-gl/dist/maplibre-gl.css'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createAtlas } from './atlas'
import { drawGymIcon, drawPokemonIcon } from './draw-icon'
import { buildMapLayers } from './layers'
import { createFixtureSource } from './source'
import type { GymEntity, MapEntity, MapQuery, PokemonEntity } from './types'
import type { Camera } from './useMapLibre'
import { useMapLibre } from './useMapLibre'

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

  const layers = useMemo(() => {
    const atlas = atlasRef.current
    if (!atlas) return []
    return buildMapLayers({
      pokemon,
      gyms,
      getIconFor: atlas.getIconFor,
      getGymIcon: drawGymIcon,
      now,
    })
  }, [pokemon, gyms, now])

  const { containerRef } = useMapLibre({
    initialCamera,
    ...(onCameraChange ? { onCameraChange } : {}),
    layers,
  })

  return (
    <div
      ref={containerRef}
      className="h-[calc(100dvh-4rem)] w-full"
      role="application"
      aria-label="Map"
    />
  )
}

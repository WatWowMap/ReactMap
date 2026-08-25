import 'maplibre-gl/dist/maplibre-gl.css'

import type { PickingInfo } from '@deck.gl/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { applyDeltaWithRules, useRules } from '../rules/rules-query'
import { createAtlas } from './atlas'
import {
  drawClusterIcon,
  drawGymIcon,
  drawPokemonIcon,
  resetSharedIconCaches,
} from './draw-icon'
import { useEntityStore } from './entity-store'
import type { MapLayersResult } from './layers'
import {
  buildMapLayers,
  buildPokemonTextLayer,
  POKEMON_LABEL_LAYER_ID,
} from './layers'
import { Popup } from './popup'
import { profilingMap, profRecord } from './profile-map'
import { createRingAtlas } from './ring-icon'
import { loadSpriteIndex } from './sprite-source'
import type { MapEntity, Viewport } from './types'
import { useDismissOnEscape } from './use-dismiss-on-escape'
import type { Camera } from './use-map-libre'
import { anchorFor, pickedEntityFrom, useMapLibre } from './use-map-libre'
import { useMapSocket } from './use-map-socket'
import { useWebglContextRecovery } from './use-webgl-context-recovery'
import type { DeltaMessage } from './wire'

export interface MapCanvasProps {
  initialCamera: Camera
  onCameraChange?: (camera: Camera) => void
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
 * Every account has exactly one profile, seeded on first sign-in
 * (`seedProfileForUser`), and the profile switcher this would come from
 * is deferred -- see the filters design spec's Deferred section. This id
 * exists only to give `useRules`' query key the shape it will need once
 * a switcher lands (`rules-query.ts`'s `rulesQueryKey`); `rules.list`
 * itself never reads it, since the server resolves the caller's profile
 * from the session.
 */
const CURRENT_PROFILE_ID = 1

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
  // the atlas's LRU cache is created exactly once for the component's
  // lifetime, not rebuilt on every render.
  const atlasRef = useRef<ReturnType<typeof createAtlas> | null>(null)
  if (atlasRef.current === null) {
    atlasRef.current = createAtlas({ draw: drawPokemonIcon })
  }

  // The rings are a second, much smaller atlas, created once for the same
  // reason and kept apart from the species one on purpose: it is keyed by
  // colour combination alone, so it neither grows with what is on screen
  // nor gets thrown away when the species atlas does. See ring-icon.ts.
  const ringAtlasRef = useRef<ReturnType<typeof createRingAtlas> | null>(null)
  if (ringAtlasRef.current === null) {
    ringAtlasRef.current = createRingAtlas()
  }

  // One narrow selector per array, read in the component that draws them.
  // Each array is a stable reference until a delta batch actually changes
  // that category, which is what keeps deck.gl from re-uploading a layer's
  // buffers for a change in the other one.
  const pokemon = useEntityStore((state) => state.pokemon)
  const gyms = useEntityStore((state) => state.gyms)
  // `useRules`' own `rules` reference is stable across renders that did
  // not change the fetched set (see rules-query.ts), so this does not
  // reintroduce the per-render allocation `buildMapLayers` below has to
  // avoid. The profile id is a placeholder: this plan seeds exactly one
  // profile per account and defers the switcher, so there is nothing yet
  // for a client to choose between -- see rules-query.ts's `rulesQueryKey`.
  const { rules, refetch: refetchRules } = useRules(CURRENT_PROFILE_ID)
  // Countdown/IV text is layer data, not a per-marker component: this is
  // the one clock this whole tree reads, and every timer-bearing layer is
  // rebuilt from it on the same tick rather than each owning its own. It
  // is also the clock a verified expiry is evicted against, so the tick
  // below does both.
  const [now, setNow] = useState(() => Date.now())

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
    ringAtlasRef.current?.clear()
    // The gym and cluster icons live in module state, not in the atlas, so
    // they need clearing too or the restore reuses dead textures.
    resetSharedIconCaches()
    setRebuildToken((token) => token + 1)
  }, [])

  // Sprites resolve against an index fetched once per page. Until it
  // lands, every marker drew as a placeholder and got cached as one, so
  // the atlas has to be dropped and the layers rebuilt the moment it
  // arrives -- otherwise the first viewport keeps its placeholders for the
  // rest of the session. Failure resolves to null rather than throwing;
  // that leaves the placeholders, which is a degraded map, not a broken
  // one.
  useEffect(() => {
    let live = true
    loadSpriteIndex().then((index) => {
      if (!live || !index) return
      atlasRef.current?.clear()
      setRebuildToken((token) => token + 1)
    })
    return () => {
      live = false
    }
  }, [])

  useDismissOnEscape(selected !== null, closePopup)

  // Recreated only when the selection itself changes, not on every render:
  // useMapLibre's reprojection effect keys off this object's identity, and
  // a fresh object every render would refire it needlessly.
  const anchor = useMemo(() => anchorFor(selected), [selected])

  // The rules version the current `rules` were fetched at. There is no
  // version on `rules.list`'s response, so the first delta of a
  // connection establishes it -- the rules were fetched moments earlier,
  // so whatever version that delta carries is the one they came from.
  // Every later move is a rule edited somewhere else.
  const fetchedRulesVersion = useRef<number | undefined>(undefined)

  const handleDelta = useCallback(
    (delta: DeltaMessage) => {
      const matched = [...delta.added, ...delta.changed].flatMap((raw) =>
        Array.isArray(raw.matched) ? (raw.matched as number[]) : [],
      )
      applyDeltaWithRules({
        matched,
        ...(delta.rulesVersion !== undefined
          ? { rulesVersion: delta.rulesVersion }
          : {}),
        ...(fetchedRulesVersion.current !== undefined
          ? { fetchedAt: fetchedRulesVersion.current }
          : {}),
        rules,
        invalidate: refetchRules,
      })
      if (delta.rulesVersion !== undefined) {
        fetchedRulesVersion.current = delta.rulesVersion
      }
    },
    [rules, refetchRules],
  )

  // The live transport. One socket for the map's lifetime, resubscribed
  // to whatever the camera frames; deltas land in the store the two
  // selectors above read, so nothing here re-renders on arrival except
  // through those. The rules half of an envelope is the exception, and
  // goes through `handleDelta` above.
  useMapSocket(viewport?.bounds ?? null, { onDelta: handleDelta })

  useEffect(() => {
    const interval = setInterval(() => {
      const tick = Date.now()
      setNow(tick)
      // A pokemon with a verified despawn time leaves the map on this
      // clock alone. The server never sends a `removed` for one, because
      // it holds that the client can work it out -- so if this did not
      // run, the marker would sit there until the viewport moved.
      useEntityStore.getState().evictExpired(tick)
    }, CLOCK_TICK_MS)
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
    const profAt = profilingMap() ? performance.now() : 0
    const result = buildMapLayers({
      pokemon,
      gyms,
      getIconFor: atlas.getIconFor,
      getGymIcon: drawGymIcon,
      getClusterIcon: drawClusterIcon,
      ...(ringAtlasRef.current
        ? { getRingIcon: ringAtlasRef.current.getRingIconFor }
        : {}),
      rules,
      // Any value: the text layer this produces is replaced on every tick.
      now: 0,
      ...(viewport ? { viewport } : {}),
    })
    profRecord('cluster + build layers', performance.now() - profAt, {
      inPokemon: pokemon.length,
      inGyms: gyms.length,
      outLayers: result.layers.length,
    })
    return result
    // rebuildToken is intentionally in this array with no other purpose
    // than to invalidate this memo; see handleContextRestore above.
  }, [pokemon, gyms, viewport, rebuildToken, rules])

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
          // The same map the layers resolve appearance from, so the
          // popup names the rules that produced what is on screen rather
          // than resolving a second, possibly different, answer.
          rules={rules}
        />
      )}
    </div>
  )
}

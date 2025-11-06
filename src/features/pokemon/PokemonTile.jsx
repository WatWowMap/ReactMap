/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { Marker, Popup, Circle, Polygon } from 'react-leaflet'
import { t } from 'i18next'
import { S2CellId, S2LatLng } from 'nodes2ts'

import { useMarkerTimer } from '@hooks/useMarkerTimer'
import { NEARBY_CELL_LEVEL, getOffset } from '@utils/offset'
import { getBadge } from '@utils/getBadge'
import { basicEqualFn, useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useOpacity } from '@hooks/useOpacity'
import { useForcePopup } from '@hooks/useForcePopup'
import { useManualPopupTracker } from '@hooks/useManualPopupTracker'
import { sendNotification } from '@services/desktopNotification'
import { useMapStore } from '@store/useMapStore'
import { TooltipWrapper } from '@components/ToolTipWrapper'
import { getTimeUntil } from '@utils/getTimeUntil'
import { normalizeCategory } from '@utils/normalizeCategory'
import { getS2Polygon } from '@utils/getS2Polygon'

import { PokemonPopup } from './PokemonPopup'
import { basicPokemonMarker, fancyPokemonMarker } from './pokemonMarker'

const INTERACTION_RANGE_COLOR = '#BA42F6'

/**
 *
 * @param {import('@rm/types').Pokemon} pkmn
 * @param {import('@rm/types').PokemonGlow} userSettings
 * @returns {string}
 */
const getGlowStatus = (pkmn, userSettings) => {
  const { glowRules } = useMemory.getState()
  const valid = glowRules
    .map((rule) => userSettings[rule(pkmn)])
    .filter(Boolean)
  return valid.length > 1 ? userSettings.Multiple : valid[0]
}

/**
 *
 * @param {import('@rm/types').Pokemon & { force?: boolean }} pkmn
 * @returns
 */
const BasePokemonTile = (pkmn) => {
  const internalId = `${pkmn.pokemon_id}-${pkmn.form}`

  const [markerRef, setMarkerRef] = React.useState(null)

  const opacity = useOpacity('pokemon')(pkmn.expire_timestamp)

  const [
    showTimer,
    showGlow,
    showIv,
    showLevel,
    showWeather,
    showSize,
    showInteractionRange,
    showSpacialRendRange,
    filterSize,
  ] = useStorage((s) => {
    const {
      pokemonTimers,
      glow,
      ivCircles,
      minIvCircle,
      levelCircles,
      minLevelCircle,
      weatherIndicator,
      showSizeIndicator,
      interactionRanges,
      spacialRendRange,
    } = s.userSettings.pokemon
    return [
      pokemonTimers,
      glow ? getGlowStatus(pkmn, s.userSettings.pokemon) : undefined,
      !!(ivCircles && pkmn.iv !== null && pkmn.iv >= minIvCircle),
      !!(levelCircles && pkmn.level !== null && pkmn.level >= minLevelCircle),
      !!(pkmn.weather && weatherIndicator),
      showSizeIndicator && Number.isInteger(pkmn.size) && pkmn.size !== 3,
      interactionRanges,
      spacialRendRange,
      s.filters.pokemon.filter[internalId]?.size || 'md',
    ]
  }, basicEqualFn)

  const [timerOverride, iconUrl, iconSize, badge, configZoom, timeOfDay, cry] =
    useMemory((s) => {
      const { Icons, timerList, config, Audio } = s
      const badgeId = getBadge(pkmn.bestPvp)
      return [
        timerList.includes(pkmn.id),
        Icons.getPokemon(
          pkmn.pokemon_id,
          pkmn.form,
          0,
          pkmn.gender,
          pkmn.costume,
        ),
        Icons.getSize('pokemon', filterSize),
        badgeId ? Icons.getMisc(badgeId) : '',
        config.general.interactionRangeZoom <=
          useMapStore.getState().map.getZoom(),
        s.timeOfDay,
        Audio.getPokemon(
          pkmn.pokemon_id,
          pkmn.form,
          0,
          pkmn.gender,
          pkmn.costume,
        ),
      ]
    }, basicEqualFn)

  const manualParams = useMemory((s) => s.manualParams)

  const isNearbyStop = pkmn.seen_type === 'nearby_stop'
  const isLure = pkmn.seen_type?.includes('lure')
  const isNearbyCell = pkmn.seen_type === 'nearby_cell'

  const isPopupOpen = React.useMemo(() => {
    if (!manualParams) return false
    if (normalizeCategory(manualParams.category) !== 'pokemon') {
      return false
    }
    return `${manualParams.id}` === `${pkmn.id}`
  }, [manualParams, pkmn.id])

  /** @type {[number, number]} */
  const finalLocation = React.useMemo(() => {
    const seenType = pkmn.seen_type
    return seenType?.startsWith('nearby')
      ? getOffset({
          coords: /** @type {[number, number]} */ ([pkmn.lat, pkmn.lon]),
          id: pkmn.id,
          seenType,
        })
      : [pkmn.lat, pkmn.lon]
  }, [pkmn.id, pkmn.seen_type, pkmn.lat, pkmn.lon])

  /** @type {(string | import('react').ReactElement)[]} */
  const extras = React.useMemo(() => {
    const decorators = []
    if (showIv) decorators.push(`${Math.round(pkmn.iv)}%`)
    if (showLevel) decorators.push(`L${Math.round(pkmn.level)}`)
    if (showSize)
      decorators.push({ 1: 'XXS', 2: 'XS', 4: 'XL', 5: 'XXL' }[pkmn.size])
    if (badge && decorators.length > 0)
      decorators.push(
        <img key={badge} src={badge} alt={badge} style={{ height: 12 }} />,
      )
    return decorators
  }, [showIv, showLevel, showSize, badge])

  useForcePopup(pkmn.id, markerRef)
  useMarkerTimer(pkmn.expire_timestamp, markerRef)
  const handlePopupOpen = useManualPopupTracker('pokemon', pkmn.id)

  const nearbyCellPolygon = React.useMemo(() => {
    if (isNearbyCell) {
      return getS2Polygon(
        S2CellId.fromPoint(
          S2LatLng.fromDegrees(pkmn.lat, pkmn.lon).toPoint(),
        ).parentL(NEARBY_CELL_LEVEL),
      )
    }
    return null
  }, [isNearbyCell, pkmn.lat, pkmn.lon])

  sendNotification(
    pkmn.id,
    `${t(`poke_${pkmn.pokemon_id}`)}${
      pkmn.form ? ` (${t(`form_${pkmn.form}`)})` : ''
    }`,
    'pokemon',
    {
      icon: iconUrl,
      body: `A${pkmn.atk_iv || '?'} | D${pkmn.def_iv || '?'} | S${
        pkmn.sta_iv || '?'
      } | L${pkmn.level || '?'} | CP${pkmn.cp || '?'}\n${
        getTimeUntil(pkmn.expire_timestamp * 1000, true).str
      }`,
      lat: pkmn.lat,
      lon: pkmn.lon,
      expire: pkmn.expire_timestamp,
      audio: cry,
    },
  )
  if (pkmn.expire_timestamp < Date.now() / 1000) {
    return null
  }

  return (
    <>
      {isPopupOpen && !!nearbyCellPolygon ? (
        <Polygon
          positions={nearbyCellPolygon}
          pathOptions={{
            color: INTERACTION_RANGE_COLOR,
            weight: 1,
            opacity: 1,
            fillColor: INTERACTION_RANGE_COLOR,
            fillOpacity: 0.2,
          }}
          interactive={false}
        />
      ) : null}
      {isPopupOpen && isNearbyStop ? (
        <Circle
          center={[pkmn.lat, pkmn.lon]}
          radius={40}
          pathOptions={{
            color: INTERACTION_RANGE_COLOR,
            weight: 1,
            opacity: 1,
            fillColor: INTERACTION_RANGE_COLOR,
            fillOpacity: 0.2,
          }}
          interactive={false}
        />
      ) : null}
      <Marker
        ref={setMarkerRef}
        zIndexOffset={
          (typeof pkmn.iv === 'number' ? pkmn.iv || 99 : 0) * 100 +
          40.96 -
          pkmn.bestPvp
        }
        position={finalLocation}
        icon={
          (pkmn.bestPvp !== null && pkmn.bestPvp < 4 && extras.length === 0) ||
          showGlow ||
          showWeather ||
          opacity < 1 ||
          pkmn.seen_type === 'nearby_cell'
            ? fancyPokemonMarker({
                pkmn,
                iconUrl,
                iconSize,
                showGlow,
                showWeather,
                badge: extras.length ? null : badge,
                opacity,
                timeOfDay,
              })
            : basicPokemonMarker({ iconUrl, iconSize })
        }
        eventHandlers={{ popupopen: handlePopupOpen }}
      >
        <Popup position={finalLocation}>
          <PokemonPopup pokemon={pkmn} iconUrl={iconUrl} />
        </Popup>
        {(showTimer || timerOverride || extras.length > 0) && (
          <TooltipWrapper
            timers={showTimer || timerOverride ? [pkmn.expire_timestamp] : []}
            offset={[0, 14]}
          >
            {extras.length > 0 && (
              <div className="iv-badge flex-center">
                {extras.map((val, i) => (
                  <span
                    key={typeof val === 'string' ? val : val.key}
                    className="flex-center"
                  >
                    {i ? <>&nbsp;|&nbsp;</> : null}
                    {val}
                  </span>
                ))}
              </div>
            )}
          </TooltipWrapper>
        )}
        {!isNearbyStop &&
          !isNearbyCell &&
          (showInteractionRange || (isLure && isPopupOpen)) &&
          configZoom && (
            <Circle
              center={[pkmn.lat, pkmn.lon]}
              radius={40}
              color={INTERACTION_RANGE_COLOR}
              weight={1}
            />
          )}
        {!isNearbyStop &&
          !isNearbyCell &&
          showSpacialRendRange &&
          configZoom && (
            <Circle
              center={[pkmn.lat, pkmn.lon]}
              radius={80}
              color="#4E893E"
              dashArray="5, 5"
              weight={1}
            />
          )}
      </Marker>
    </>
  )
}

export const PokemonTile = React.memo(
  BasePokemonTile,
  (prev, next) => prev.updated === next.updated,
)

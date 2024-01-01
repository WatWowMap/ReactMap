/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { Marker, Popup, Circle } from 'react-leaflet'

import useMarkerTimer from '@hooks/useMarkerTimer'
import { getOffset } from '@services/functions/offset'
import { getBadge } from '@services/functions/getBadge'
import { basicEqualFn, useStatic, useStore } from '@hooks/useStore'
import useOpacity from '@hooks/useOpacity'
import useForcePopup from '@hooks/useForcePopup'
import Utility from '@services/Utility'
import { sendNotification } from '@services/desktopNotification'

import PopupContent from '../popups/Pokemon'
import { basicMarker, fancyMarker } from '../markers/pokemon'
import ToolTipWrapper from './Timer'

const OPERATOR =
  /** @type {{ [key in '=' | '<' | '<=' | '>'| '>=']: (a: number, b: number) => boolean }} */ ({
    '=': (a, b) => a === b,
    '<': (a, b) => a < b,
    '<=': (a, b) => a <= b,
    '>': (a, b) => a > b,
    '>=': (a, b) => a >= b,
  })

/**
 *
 * @param {import('@rm/types').Pokemon} pkmn
 * @param {object} userSettings
 * @returns
 */
const getGlowStatus = (pkmn, userSettings) => {
  const staticUserSettings = useStatic.getState().userSettings.pokemon
  let glowCount = 0
  let glowValue
  Object.entries(staticUserSettings.glow.sub).forEach((rule) => {
    const [ruleKey, ruleValue] = rule
    const statKey = ruleValue.perm === 'iv' ? 'iv' : 'bestPvp'
    if (ruleValue.op) {
      if (
        ruleValue.op in OPERATOR &&
        OPERATOR[ruleValue.op](pkmn[statKey], ruleValue.num) &&
        pkmn[statKey] !== null
      ) {
        glowCount += 1
        glowValue = userSettings[ruleKey]
      }
    }
  })
  if (glowCount > 1) {
    return userSettings.Multiple
  }
  return glowValue
}

/**
 *
 * @param {import('@rm/types').Pokemon & { force?: boolean }} pkmn
 * @returns
 */
const PokemonTile = (pkmn) => {
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
    filterSize,
  ] = useStore((s) => {
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
    } = s.userSettings.pokemon
    return [
      pokemonTimers,
      glow ? getGlowStatus(pkmn, s.userSettings.pokemon) : undefined,
      !!(ivCircles && pkmn.iv !== null && pkmn.iv >= minIvCircle),
      !!(levelCircles && pkmn.level !== null && pkmn.level >= minLevelCircle),
      !!(pkmn.weather && weatherIndicator),
      showSizeIndicator && Number.isInteger(pkmn.size) && pkmn.size !== 3,
      interactionRanges,
      s.filters.pokemon.filter[internalId]?.size || 'md',
    ]
  }, basicEqualFn)

  const [
    excluded,
    timerOverride,
    iconUrl,
    iconSize,
    badge,
    configZoom,
    timeOfDay,
  ] = useStatic((s) => {
    const { Icons, excludeList, timerList, config, map } = s
    const badgeId = getBadge(pkmn.bestPvp)
    return [
      excludeList.includes(internalId),
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
      config.general.interactionRangeZoom <= map.getZoom(),
      s.timeOfDay,
      s.manualParams.category === 'pokemon' && s.manualParams.id === pkmn.id,
    ]
  }, basicEqualFn)
  const UAudio = useStatic((s) => s.Audio)

  /** @type {[number, number]} */
  const finalLocation = React.useMemo(
    () =>
      pkmn.seen_type?.startsWith('nearby') || pkmn.seen_type?.includes('lure')
        ? getOffset(
            [pkmn.lat, pkmn.lon],
            pkmn.seen_type === 'nearby_cell' ? 0.0002 : 0.00015,
            pkmn.id,
          )
        : [pkmn.lat, pkmn.lon],
    [pkmn.seen_type, pkmn.lat, pkmn.lon],
  )

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
  sendNotification(
    pkmn.id,
    `poke_${pkmn.pokemon_id}${pkmn.form ? `,form_${pkmn.form}` : ''}`,
    'pokemon',
    {
      icon: iconUrl,
      tag: pkmn.id,
      body: `A${pkmn.atk_iv} | D${pkmn.def_iv} | S${pkmn.sta_iv} | L${
        pkmn.level
      } | CP${pkmn.cp}\n${
        Utility.getTimeUntil(new Date(pkmn.expire_timestamp * 1000), true).str
      }`,
      lat: pkmn.lat,
      lon: pkmn.lon,
      expire: pkmn.expire_timestamp,
      audio: UAudio.getPokemon(pkmn.pokemon_id, pkmn.form),
    },
  )
  if (pkmn.expire_timestamp < Date.now() / 1000 || excluded) {
    return null
  }

  return (
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
          ? fancyMarker({
              pkmn,
              iconUrl,
              iconSize,
              showGlow,
              showWeather,
              badge: extras.length ? null : badge,
              opacity,
              timeOfDay,
            })
          : basicMarker({ iconUrl, iconSize })
      }
    >
      <Popup position={finalLocation}>
        <PopupContent pokemon={pkmn} iconUrl={iconUrl} />
      </Popup>
      {(showTimer || timerOverride || extras.length > 0) && (
        <ToolTipWrapper
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
        </ToolTipWrapper>
      )}
      {showInteractionRange && configZoom && (
        <Circle
          center={finalLocation}
          radius={40}
          pathOptions={{ color: '#BA42F6', weight: 1 }}
        />
      )}
    </Marker>
  )
}

const MemoPokemonTile = React.memo(
  PokemonTile,
  (prev, next) => prev.updated === next.updated,
)

export default MemoPokemonTile

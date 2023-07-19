/* eslint-disable no-bitwise */
import React, { memo, useRef, useState, useMemo } from 'react'
import { Marker, Popup, Circle } from 'react-leaflet'

import useMarkerTimer from '@hooks/useMarkerTimer'
import useForcePopup from '@hooks/useForcePopup'

import PopupContent from '../popups/Pokemon'
import { basicMarker, fancyMarker } from '../markers/pokemon'
import ToolTipWrapper from './Timer'

const operator = {
  '=': (a, b) => a === b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
}

const cyrb53 = (str, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i += 1) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return [h1, h2]
}

const getOffset = (coords, type, seed) => {
  const offOffset = type === 'nearby_cell' ? 0.0002 : 0.00015
  const rand = cyrb53(seed)
  return [0, 1].map((i) => {
    let offset = rand[i] * (0.0002 / 4294967296) - 0.0001
    offset += offset >= 0 ? -offOffset : offOffset
    return coords[i] + offset
  })
}

const getGlowStatus = (item, userSettings, staticUserSettings) => {
  let glowCount = 0
  let glowValue
  Object.entries(staticUserSettings.glow.sub).forEach((rule) => {
    const [ruleKey, ruleValue] = rule
    const statKey = ruleValue.perm === 'iv' ? 'iv' : 'bestPvp'
    if (ruleValue.op) {
      if (
        operator[ruleValue.op](item[statKey], ruleValue.num) &&
        item[statKey] !== null
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

const PokemonTile = ({
  item,
  showTimer,
  filters,
  Icons,
  excludeList,
  ts,
  map,
  timeOfDay,
  userSettings,
  staticUserSettings,
  params,
  showCircles,
  setParams,
  config,
}) => {
  const markerRef = useRef({ [item.id]: null })
  const [done, setDone] = useState(false)
  useMarkerTimer(item.expire_timestamp, item.id, markerRef, map, ts)

  const url = Icons.getPokemon(
    item.pokemon_id,
    item.form,
    0,
    item.gender,
    item.costume,
  )
  const size = Icons.getSize(
    'pokemon',
    filters.filter[`${item.pokemon_id}-${item.form}`],
  )
  const glowStatus = userSettings.glow
    ? getGlowStatus(item, userSettings, staticUserSettings)
    : undefined
  const ivCircle =
    userSettings.ivCircles &&
    item.iv !== null &&
    item.iv >= userSettings.minIvCircle
  const pvpCheck = item.bestPvp !== null && item.bestPvp < 4
  const weatherCheck = item.weather && userSettings.weatherIndicator

  const finalLocation = useMemo(
    () =>
      item.seen_type?.startsWith('nearby') || item.seen_type?.includes('lure')
        ? getOffset([item.lat, item.lon], item.seen_type, item.id)
        : [item.lat, item.lon],
    [item.seen_type],
  )

  useForcePopup(item.id, markerRef, params, setParams, done)

  return (
    !excludeList.includes(`${item.pokemon_id}-${item.form}`) &&
    item.expire_timestamp > ts && (
      <Marker
        ref={(m) => {
          markerRef.current[item.id] = m
          if (!done && item.id === params.id) {
            setDone(true)
          }
        }}
        zIndexOffset={item.iv * 100}
        position={finalLocation}
        icon={
          pvpCheck ||
          glowStatus ||
          ivCircle ||
          weatherCheck ||
          item.seen_type === 'nearby_cell' ||
          (Number.isInteger(item.size) && (item.size !== 3 || item.size !== 0))
            ? fancyMarker(
                url,
                size,
                item,
                glowStatus,
                ivCircle,
                Icons,
                weatherCheck,
                timeOfDay,
                userSettings,
              )
            : basicMarker(url, size)
        }
      >
        <Popup position={finalLocation}>
          <PopupContent
            pokemon={item}
            iconUrl={url}
            userSettings={userSettings}
            Icons={Icons}
            timeOfDay={timeOfDay}
            config={config}
          />
        </Popup>
        {(showTimer || userSettings.pokemonTimers) && (
          <ToolTipWrapper timers={[item.expire_timestamp]} offset={[0, 18]} />
        )}
        {showCircles && (
          <Circle
            center={finalLocation}
            radius={70}
            pathOptions={{ color: '#BA42F6', weight: 1 }}
          />
        )}
      </Marker>
    )
  )
}

const areEqual = (prev, next) =>
  prev.item.id === next.item.id &&
  prev.item.updated === next.item.updated &&
  prev.showTimer === next.showTimer &&
  !next.excludeList.includes(`${prev.item.pokemon_id}-${prev.item.form}`) &&
  prev.userIcons.pokemon === next.userIcons.pokemon &&
  prev.showCircles === next.showCircles

export default memo(PokemonTile, areEqual)

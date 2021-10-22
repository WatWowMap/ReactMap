import React, { memo, useRef, useState } from 'react'
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

const getOffset = (coords, type) => coords.map(coord => {
  let offset = Math.random() * 0.0002 - 0.0001
  const offOffset = type === 'nearby_cell' ? 0.0002 : 0.00015
  offset += offset >= 0 ? -offOffset : offOffset
  return (coord + offset)
})

const getGlowStatus = (item, userSettings, staticUserSettings) => {
  let glowCount = 0
  let glowValue
  Object.entries(staticUserSettings.glow.sub).forEach(rule => {
    const [ruleKey, ruleValue] = rule
    const statKey = ruleValue.perm === 'iv' ? 'iv' : 'bestPvp'
    if (ruleValue.op) {
      if (operator[ruleValue.op](item[statKey], ruleValue.num) && item[statKey] !== null) {
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
  item, showTimer, filters, Icons, excludeList, ts, map,
  userSettings, staticUserSettings, params, showCircles, setParams,
}) => {
  const markerRef = useRef({ [item.id]: null })
  const [done, setDone] = useState(false)
  useMarkerTimer(item.expire_timestamp, item.id, markerRef, map, ts)

  const url = Icons.getPokemon(item.pokemon_id, item.form, 0, item.gender, item.costume)
  const size = Icons.getSize('pokemon', filters.filter[`${item.pokemon_id}-${item.form}`])
  const glowStatus = userSettings.glow ? getGlowStatus(item, userSettings, staticUserSettings) : undefined
  const ivCircle = userSettings.ivCircles && item.iv !== null && item.iv >= userSettings.minIvCircle
  const pvpCheck = item.bestPvp !== null && item.bestPvp < 4
  const weatherCheck = item.weather && userSettings.weatherIndicator

  const finalLocation = item.seen_type?.startsWith('nearby')
    ? getOffset([item.lat, item.lon], item.seen_type)
    : [item.lat, item.lon]

  useForcePopup(item.id, markerRef, params, setParams, done)

  return (!excludeList.includes(`${item.pokemon_id}-${item.form}`) && item.expire_timestamp > ts) && (
    <Marker
      ref={(m) => {
        markerRef.current[item.id] = m
        if (!done && item.id === params.id) {
          setDone(true)
        }
      }}
      zIndexOffset={item.iv * 100}
      position={finalLocation}
      icon={(pvpCheck || glowStatus || ivCircle || weatherCheck)
        ? fancyMarker(url, size, item, glowStatus, ivCircle, Icons, weatherCheck)
        : basicMarker(url, size)}
    >
      <Popup position={finalLocation}>
        <PopupContent
          pokemon={item}
          iconUrl={url}
          userSettings={userSettings}
          Icons={Icons}
        />
      </Popup>
      {(showTimer || userSettings.pokemonTimers) && (
        <ToolTipWrapper
          timers={[item.expire_timestamp]}
          offset={[0, 18]}
        />
      )}
      {showCircles && (
        <Circle
          center={finalLocation}
          radius={35}
          pathOptions={{ color: '#BA42F6', weight: 1 }}
        />
      )}
    </Marker>
  )
}

const areEqual = (prev, next) => (
  prev.item.id === next.item.id
  && prev.item.updated === next.item.updated
  && prev.showTimer === next.showTimer
  && prev.filters.filter[`${prev.item.pokemon_id}-${prev.item.form}`]?.size === next.filters.filter[`${next.item.pokemon_id}-${next.item.form}`]?.size
  && !next.excludeList.includes(`${prev.item.pokemon_id}-${prev.item.form}`)
  && prev.userIcons.pokemon === next.userIcons.pokemon
  && Object.keys(prev.userSettings).every(key => prev.userSettings[key] === next.userSettings[key])
  && prev.showCircles === next.showCircles
)

export default memo(PokemonTile, areEqual)

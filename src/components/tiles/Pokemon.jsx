import React, {
  useCallback, useEffect, memo, useRef, useState,
} from 'react'
import { Marker, Popup, Circle } from 'react-leaflet'

import PopupContent from '../popups/Pokemon'
import { basicMarker, fancyMarker } from '../markers/pokemon'
import Timer from './Timer'

const operator = {
  '=': function equal(a, b) {
    return a === b
  },
  '<': function less(a, b) {
    return a < b
  },
  '<=': function lessEqual(a, b) {
    return a <= b
  },
  '>': function more(a, b) {
    return a > b
  },
  '>=': function moreEqual(a, b) {
    return a >= b
  },
}

const getOffset = (coords, type) => coords.map(coord => {
  let offset = Math.random() * 0.0002 - 0.0001
  const offOffset = type === 'nearby_cell' ? 0.0002 : 0.00015
  offset += offset >= 0 ? -offOffset : offOffset
  return (coord + offset)
})

const PokemonTile = ({
  item, showTimer, filters, Icons, excludeList,
  userSettings, staticUserSettings, params, showCircles,
}) => {
  const [done, setDone] = useState(false)
  const markerRefs = useRef({})
  const url = Icons.getPokemon(item.pokemon_id, item.form, 0, item.gender, item.costume)
  const size = Icons.getSize('pokemon', filters.filter[`${item.pokemon_id}-${item.form}`])

  const getGlowStatus = useCallback(() => {
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
  }, [])
  const glowStatus = userSettings.glow ? getGlowStatus() : undefined
  const ivCircle = userSettings.ivCircles && item.iv !== null && item.iv >= userSettings.minIvCircle
  const pvpCheck = item.bestPvp !== null && item.bestPvp < 4

  useEffect(() => {
    const { id } = params
    if (id === item.id) {
      const markerToOpen = markerRefs.current[id]
      markerToOpen.openPopup()
    }
  }, [done])

  const finalLocation = item.seen_type.startsWith('nearby')
    ? getOffset([item.lat, item.lon], item.seen_type)
    : [item.lat, item.lon]

  return (
    <>
      {!excludeList.includes(`${item.pokemon_id}-${item.form}`) && (
        <Marker
          ref={(m) => {
            markerRefs.current[item.id] = m
            if (!done && item.id === params.id) {
              setDone(true)
            }
          }}
          zIndexOffset={item.iv * 100}
          position={finalLocation}
          icon={(pvpCheck || glowStatus || ivCircle)
            ? fancyMarker(url, size, item, glowStatus, ivCircle, Icons)
            : basicMarker(url, size)}
        >
          <Popup position={finalLocation} onClose={() => delete params.id}>
            <PopupContent
              pokemon={item}
              iconUrl={url}
              userSettings={userSettings}
              Icons={Icons}
            />
          </Popup>
          {(showTimer || userSettings.pokemonTimers) && (
            <Timer
              timestamp={item.expire_timestamp}
              direction="center"
              offset={[0, 30]}
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
      )}
    </>
  )
}

const areEqual = (prev, next) => (
  prev.item.id === next.item.id
  && prev.item.updated === next.item.updated
  && prev.showTimer === next.showTimer
  && prev.filters.filter[`${prev.item.pokemon_id}-${prev.item.form}`].size === next.filters.filter[`${next.item.pokemon_id}-${next.item.form}`].size
  && !next.excludeList.includes(`${prev.item.pokemon_id}-${prev.item.form}`)
  && prev.userIcons.pokemon === next.userIcons.pokemon
  && Object.keys(prev.userSettings).every(key => prev.userSettings[key] === next.userSettings[key])
  && prev.showCircles === next.showCircles
)

export default memo(PokemonTile, areEqual)

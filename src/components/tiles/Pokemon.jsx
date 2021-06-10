import React, {
  useCallback, useEffect, memo, useRef, useState,
} from 'react'
import { Marker, Popup, Circle } from 'react-leaflet'

import Utility from '@services/Utility'
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

const PokemonTile = ({
  item, showTimer, filters, iconSizes, path, availableForms, excludeList,
  userSettings, staticUserSettings, params, showCircles,
}) => {
  const [done, setDone] = useState(false)
  const markerRefs = useRef({})
  const iconUrl = `${path}/${Utility.getPokemonIcon(availableForms, item.pokemon_id, item.form, 0, 0, item.costume)}.png`

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
  const ivCircle = userSettings.ivCircles && item.iv >= userSettings.minIvCircle
  useEffect(() => {
    const { id } = params
    if (id === item.id) {
      const markerToOpen = markerRefs.current[id]
      markerToOpen.openPopup()
    }
  }, [done])

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
          position={[item.lat, item.lon]}
          icon={(item.bestPvp < 4 || glowStatus || ivCircle)
            ? fancyMarker(iconUrl, item, filters, iconSizes, glowStatus, userSettings.ivCircles)
            : basicMarker(iconUrl, item, filters, iconSizes)}
        >
          <Popup position={[item.lat, item.lon]} onClose={() => delete params.id}>
            <PopupContent
              pokemon={item}
              iconUrl={iconUrl}
              userSettings={userSettings}
            />
          </Popup>
          {showTimer && (
            <Timer
              timestamp={item.expire_timestamp}
              direction="center"
              offset={[0, 30]}
            />
          )}
          {showCircles && (
            <Circle
              center={[item.lat, item.lon]}
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
  && prev.path === next.path
  && prev.userSettings.legacyFilter === next.userSettings.legacyFilter
  && prev.userSettings.ivCircles === next.userSettings.ivCircles
  && prev.userSettings.minIvCircle === next.userSettings.minIvCircle
  && prev.showCircles === next.showCircles
)

export default memo(PokemonTile, areEqual)

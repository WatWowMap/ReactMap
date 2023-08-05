/* eslint-disable no-bitwise */
import React, { memo, useRef, useState, useMemo } from 'react'
import { Marker, Popup, Circle } from 'react-leaflet'

import useMarkerTimer from '@hooks/useMarkerTimer'
import useForcePopup from '@hooks/useForcePopup'
import { getOffset } from '@services/functions/offset'

import PopupContent from '../popups/Pokemon'
import { basicMarker, fancyMarker } from '../markers/pokemon'
import ToolTipWrapper from './Timer'

const OPERATOR = {
  '=': (a, b) => a === b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
}

const getBadge = (bestPvp) => {
  switch (bestPvp) {
    case 1:
      return 'first'
    case 2:
      return 'second'
    case 3:
      return 'third'
    default:
      return ''
  }
}

const getGlowStatus = (item, userSettings, staticUserSettings) => {
  let glowCount = 0
  let glowValue
  Object.entries(staticUserSettings.glow.sub).forEach((rule) => {
    const [ruleKey, ruleValue] = rule
    const statKey = ruleValue.perm === 'iv' ? 'iv' : 'bestPvp'
    if (ruleValue.op) {
      if (
        OPERATOR[ruleValue.op](item[statKey], ruleValue.num) &&
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
  const levelCircle =
    userSettings.levelCircles &&
    item.level !== null &&
    item.level >= userSettings.minLevelCircle
  const weatherCheck = item.weather && userSettings.weatherIndicator
  const showSize =
    userSettings?.showSizeIndicator &&
    Number.isInteger(item.size) &&
    item.size !== 3
  const timerCheck = showTimer || userSettings.pokemonTimers
  const badge = getBadge(item.bestPvp)

  const finalLocation = useMemo(
    () =>
      item.seen_type?.startsWith('nearby') || item.seen_type?.includes('lure')
        ? getOffset(
            [item.lat, item.lon],
            item.seen_type === 'nearby_cell' ? 0.0002 : 0.00015,
            item.id,
          )
        : [item.lat, item.lon],
    [item.seen_type],
  )

  useForcePopup(item.id, markerRef, params, setParams, done)

  const extras = []
  if (ivCircle) extras.push(`${Math.round(item.iv)}%`)
  if (levelCircle) extras.push(`L${Math.round(item.level)}`)
  if (showSize) extras.push({ 1: 'XXS', 2: 'XS', 4: 'XL', 5: 'XXL' }[item.size])
  if (badge && extras.length > 0)
    extras.push(
      <img
        key={badge}
        src={Icons.getMisc(badge)}
        alt={badge}
        style={{ height: 12 }}
      />,
    )
  const pvpCheck =
    item.bestPvp !== null && item.bestPvp < 4 && extras.length === 0

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
          weatherCheck ||
          item.seen_type === 'nearby_cell' ||
          (Number.isInteger(item.size) && (item.size !== 3 || item.size !== 0))
            ? fancyMarker(
                url,
                size,
                item,
                glowStatus,
                Icons,
                weatherCheck,
                timeOfDay,
                userSettings,
                extras.length ? null : badge,
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
        {(timerCheck || extras.length > 0) && (
          <ToolTipWrapper
            timers={timerCheck ? [item.expire_timestamp] : []}
            offset={[0, 14]}
            id={item.id}
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
        {showCircles && (
          <Circle
            center={finalLocation}
            radius={40}
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

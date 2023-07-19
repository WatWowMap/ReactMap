import React from 'react'
import { renderToString } from 'react-dom/server'
import { Icon, divIcon } from 'leaflet'
import getOpacity from '@services/functions/getOpacity'

export const basicMarker = (iconUrl, size) =>
  new Icon({
    iconUrl,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, size * -0.6],
    className: 'marker',
  })

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

export const fancyMarker = (
  iconUrl,
  size,
  pkmn,
  glow,
  ivCircle,
  Icons,
  weatherCheck,
  timeOfDay,
  userSettings,
) => {
  const { pokemon: pokemonMod, weather: weatherMod } = Icons.modifiers
  const badge = getBadge(pkmn.bestPvp)

  const ReactIcon = (
    <div
      className="marker-image-holder top-overlay"
      style={{ opacity: getOpacity(pkmn.expire_timestamp) }}
    >
      <img
        src={iconUrl}
        alt={pkmn.pokemon_id}
        style={{
          WebkitFilter: glow
            ? `drop-shadow(0 0 10px ${glow})drop-shadow(0 0 10px ${glow})`
            : undefined,
          height: size,
          width: size,
        }}
      />
      {pkmn.seen_type === 'nearby_cell' && (
        <img
          src={Icons.getMisc('grass')}
          alt="nearby_cell"
          style={{
            width: size / 1.5,
            height: 'auto',
            bottom: (-size / 5) * pokemonMod.offsetY,
            left: `10%`,
          }}
        />
      )}
      {badge && (
        <img
          src={Icons.getMisc(badge)}
          alt={badge}
          style={{
            width: size / 2,
            height: 'auto',
            bottom: (-size / 5) * pokemonMod.offsetY,
            left: `${pokemonMod.offsetX * size * 4}%`,
          }}
        />
      )}
      {ivCircle && !badge && (
        <div
          className="iv-badge"
          style={{
            bottom: (-size / 5) * pokemonMod.offsetY,
            left: `${pokemonMod.offsetX * size * 5}%`,
          }}
        >
          {Math.round(pkmn.iv)}
        </div>
      )}
      {userSettings?.showSizeIndicator &&
        Number.isInteger(pkmn.size) &&
        pkmn.size !== 3 && (
          <div
            className="iv-badge"
            style={{
              bottom: (-size / 5) * pokemonMod.offsetY,
              right: `${pokemonMod.offsetX * size}%`,
              fontSize: 10,
            }}
          >
            {{ 1: 'XXS', 2: 'XS', 3: 'MD', 4: 'XL', 5: 'XXL' }[pkmn.size]}
          </div>
        )}
      {Boolean(weatherCheck) && (
        <div
          className="weather-icon"
          style={{
            width: size / 2,
            height: size / 2,
            top: -size * pokemonMod.offsetY,
            left: `${pokemonMod.offsetX * size * 5}%`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={Icons.getWeather(pkmn.weather, timeOfDay)}
            alt={pkmn.weather}
            className={weatherMod.disableColorShift ? '' : 'fancy'}
            style={{
              width: size / 3,
              height: size / 3,
            }}
          />
        </div>
      )}
    </div>
  )

  return divIcon({
    popupAnchor: [
      0 + pokemonMod.popupX,
      size * -0.7 * pokemonMod.offsetY + pokemonMod.popupY,
    ],
    iconAnchor: [size / 2, 0],
    className: 'pokemon-marker',
    html: renderToString(ReactIcon),
  })
}

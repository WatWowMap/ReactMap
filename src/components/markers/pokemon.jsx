import React from 'react'
import { renderToString } from 'react-dom/server'
import L, { Icon } from 'leaflet'

export const basicMarker = (iconUrl, size) =>
  new Icon({
    iconUrl,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, size * -0.6],
    className: 'marker',
  })

export const fancyMarker = (
  iconUrl,
  size,
  pkmn,
  glow,
  ivCircle,
  Icons,
  weatherCheck,
  timeOfDay,
) => {
  const { pokemon: pokemonMod, weather: weatherMod } = Icons.modifiers
  let badge
  switch (pkmn.bestPvp) {
    case 1:
      badge = 'first'
      break
    case 2:
      badge = 'second'
      break
    case 3:
      badge = 'third'
      break
    default:
      break
  }

  const ReactIcon = (
    <div className="marker-image-holder top-overlay">
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

  return L.divIcon({
    popupAnchor: [
      0 + pokemonMod.popupX,
      size * -0.7 * pokemonMod.offsetY + pokemonMod.popupY,
    ],
    iconAnchor: [size / 2, 0],
    className: 'pokemon-marker',
    html: renderToString(ReactIcon),
  })
}

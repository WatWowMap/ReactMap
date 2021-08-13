import React from 'react'
import { renderToString } from 'react-dom/server'
import L, { Icon } from 'leaflet'

export const basicMarker = (iconUrl, size) => new Icon({
  iconUrl,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
  popupAnchor: [0, size * -0.6],
  className: 'marker',
})

export const fancyMarker = (iconUrl, size, pkmn, glow, ivCircle, Icons) => {
  const { pokemon: pokemonMod } = Icons.modifiers
  let badge
  switch (pkmn.bestPvp) {
    default: break
    case 1: badge = 'first'; break
    case 2: badge = 'second'; break
    case 3: badge = 'third'; break
  }

  const ReactIcon = (
    <>
      <div className="marker-image-holder top-overlay">
        <img
          src={iconUrl}
          style={{
            WebkitFilter: glow ? `drop-shadow(0 0 10px ${glow})drop-shadow(0 0 10px ${glow})` : undefined,
            height: size,
            width: size,
          }}
        />
        {badge && (
          <img
            src={Icons.getMisc(badge)}
            style={{
              width: size / 2,
              height: 'auto',
              bottom: (-size / 4) * pokemonMod.offsetY,
              left: `${pokemonMod.offsetX * size * 5}%`,
            }}
          />
        )}
        {(ivCircle && !badge) && (
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
      </div>
    </>
  )

  return L.divIcon({
    popupAnchor: [(badge || ivCircle || glow ? size / 2.5 : 0), size * -0.8],
    className: 'pokemon-marker',
    html: renderToString(ReactIcon),
  })
}

import React from 'react'
import { renderToString } from 'react-dom/server'
import L from 'leaflet'

export default function nestMarker(iconUrl, nest, pokemon, filters, Icons, recent) {
  const { types } = pokemon
  const filterId = `${nest.pokemon_id}-${nest.pokemon_form}`
  const size = Icons.getSize('nest', filters.filter[filterId])
  const {
    offsetX, offsetY, popupX, popupY, sizeMultiplier, nestMonSizeMulti = 1,
  } = Icons.getModifiers('nest')
  const { nest: nestMod } = Icons.modifiers
  const opacity = recent ? 1 : 0.5

  const ReactIcon = (
    <div className="marker-image-holder">
      <span className="text-nowrap">
        <img
          src={Icons.getNests(types[0])}
          alt={types[0]}
          className={types.length === 2 ? 'type-img-1' : 'type-img-single'}
          style={{
            width: size,
            height: 'auto',
            opacity,
          }}
        />
        {types.length === 2 && (
          <img
            src={Icons.getNests(types[1])}
            alt={types[1]}
            className="type-img-2"
            style={{
              width: size,
              height: 'auto',
              opacity,
            }}
          />
        )}
      </span>
      <img
        src={iconUrl}
        alt={nest.pokemon_id}
        style={{
          width: size * nestMonSizeMulti,
          height: size * nestMonSizeMulti,
          bottom: nestMod.offsetY - 1,
          left: nestMod.offsetX - 1,
          opacity,
        }}
      />
    </div>
  )

  return L.divIcon({
    iconSize: [size * sizeMultiplier, size * sizeMultiplier],
    iconAnchor: [(size / 2) * offsetX, (size / 0.75) * offsetY],
    popupAnchor: [
      0 + popupX - nestMod.offsetX * 0.6 + nestMod.popupX,
      -8 - size + popupY - nestMod.offsetY * 0.6 + nestMod.popupY,
    ],
    className: 'nest-marker',
    html: renderToString(ReactIcon),
  })
}

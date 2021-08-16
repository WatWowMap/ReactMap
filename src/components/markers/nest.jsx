import React from 'react'
import { renderToString } from 'react-dom/server'
import L from 'leaflet'

export default function nestMarker(iconUrl, nest, pokemon, filters, Icons, recent) {
  const { types } = pokemon
  const filterId = `${nest.pokemon_id}-${nest.pokemon_form}`
  const size = Icons.getSize('nest', filters.filter[filterId])
  const opacity = recent ? 1 : 0.5

  const ReactIcon = (
    <div className="marker-image-holder">
      <span className="text-nowrap">
        <img
          src={`/images/nest/nest-${types[0].toLowerCase()}.png`}
          className={types.length === 2 ? 'type-img-1' : 'type-img-single'}
          style={{
            width: size,
            height: 'auto',
            opacity,
          }}
        />
        {types.length === 2 && (
          <img
            src={`/images/nest/nest-${types[1].toLowerCase()}.png`}
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
        style={{
          width: size,
          height: 'auto',
          opacity,
        }}
      />
    </div>
  )

  return L.divIcon({
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 0.75],
    popupAnchor: [0, -8 - size],
    className: 'nest-marker',
    html: renderToString(ReactIcon),
  })
}

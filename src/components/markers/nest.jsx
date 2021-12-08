import React from 'react'
import { renderToString } from 'react-dom/server'
import L from 'leaflet'

export default function nestMarker(iconUrl, nest, pokemon, filters, Icons, recent) {
  const { types } = pokemon
  const filterId = `${nest.pokemon_id}-${nest.pokemon_form}`
  const size = Icons.getSize('nest', filters.filter[filterId])
  const { x, y } = Icons.getPopupOffset('nest')
  const opacity = recent ? 1 : 0.5

  const ReactIcon = (
    <div className="marker-image-holder">
      <span className="text-nowrap">
        <img
          src={Icons.getNests(types[0])}
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
          height: size,
          opacity,
        }}
      />
    </div>
  )

  return L.divIcon({
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 0.75],
    popupAnchor: [0 + x, -8 - size + y],
    className: 'nest-marker',
    html: renderToString(ReactIcon),
  })
}

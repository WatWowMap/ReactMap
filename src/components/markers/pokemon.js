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

export const fancyMarker = (
  iconUrl,
  size,
  pkmn,
  glow,
  Icons,
  weatherCheck,
  timeOfDay,
  userSettings,
  badge,
) => {
  const [pokemonMod, weatherMod] = Icons.getModifiers('pokemon', 'weather')

  return divIcon({
    popupAnchor: [
      0 + pokemonMod.popupX,
      size * -0.7 * pokemonMod.offsetY + pokemonMod.popupY,
    ],
    iconAnchor: [size / 2, 0],
    className: 'pokemon-marker',
    html: /* html */ `
      <div
        id="pokemon-${pkmn.id}"
        class="marker-image-holder top-overlay"
        style="
          opacity: ${
            userSettings.pokemonOpacity
              ? getOpacity(pkmn.expire_timestamp, userSettings)
              : 1
          };
        "
      >
        <img
          src="${iconUrl}"
          alt="${pkmn.pokemon_id}"
          style="
            -webkit-filter: ${
              glow
                ? `drop-shadow(0 0 10px ${glow})drop-shadow(0 0 10px ${glow})`
                : 'none'
            };
            filter: ${
              glow
                ? `drop-shadow(0 0 10px ${glow})drop-shadow(0 0 10px ${glow})`
                : 'none'
            };
            height: ${size}px;
            width: ${size}px;
          "
        />
        ${
          pkmn.seen_type === 'nearby_cell'
            ? /* html */ `
            <img
              src="${Icons.getMisc('grass')}"
              alt="nearby_cell"
              style="
                width: ${size / 1.5}px;
                height: auto;
                bottom: ${(-size / 5) * pokemonMod.offsetY}px;
                left: 10%;
              "
            />`
            : ''
        }
        ${
          badge
            ? /* html */ `
            <img
             src="${Icons.getMisc(badge)}"
             alt="${badge}"
             style="
               width: ${size / 2}px;
               height: auto;
               bottom: ${(-size / 5) * pokemonMod.offsetY}px;
               left: ${pokemonMod.offsetX * size * 4}%;
             "
             />`
            : ''
        }
        ${
          weatherCheck
            ? /* html */ `
            <div
              class="weather-icon"
              style="
                width: ${Math.max(17, size / 2)}px;
                height: ${Math.max(17, size / 2)}px;
                top: ${-size * pokemonMod.offsetY}px;
                left: ${pokemonMod.offsetX * size * 5}%;
                display: flex;
                align-items: center;
                justify-content: center;
                border-width: ${Math.max(1, size / 24)}px;
              "
            >
              <img
                src="${Icons.getWeather(pkmn.weather, timeOfDay)}"
                alt="${pkmn.weather}"
                class="${weatherMod.disableColorShift ? '' : 'fancy'}"
                style="
                  width: ${Math.max(10, size / 3)}px;
                  height: ${Math.max(10, size / 3)}px;
                "
              />
            </div>`
            : ''
        }
      </div>
    `,
  })
}

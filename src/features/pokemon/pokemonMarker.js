import { Icon, divIcon } from 'leaflet'
import { useMemory } from '@store/useMemory'

/**
 *
 * @param {{ iconUrl: string, iconSize: number }} props
 * @returns
 */
export const basicPokemonMarker = ({ iconUrl, iconSize }) =>
  new Icon({
    iconUrl,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2],
    popupAnchor: [0, iconSize * -0.6],
    className: 'marker',
  })

export const fancyPokemonMarker = ({
  pkmn,
  iconUrl,
  iconSize,
  showGlow,
  showWeather,
  badge,
  opacity,
  timeOfDay,
}) => {
  const { Icons } = useMemory.getState()
  const [pokemonMod, weatherMod] = Icons.getModifiers('pokemon', 'weather')

  return divIcon({
    popupAnchor: [
      0 + pokemonMod.popupX,
      iconSize * -0.7 * pokemonMod.offsetY + pokemonMod.popupY,
    ],
    iconAnchor: [iconSize / 2, 0],
    className: 'pokemon-marker',
    html: /* html */ `
      <div
        id="pokemon-${pkmn.id}"
        class="marker-image-holder top-overlay"
        style="
          opacity: ${opacity};
        "
      >
        <img
          src="${iconUrl}"
          alt="${pkmn.pokemon_id}"
          style="
            -webkit-filter: ${
              showGlow
                ? `drop-shadow(0 0 10px ${showGlow})drop-shadow(0 0 10px ${showGlow})`
                : 'none'
            };
            filter: ${
              showGlow
                ? `drop-shadow(0 0 10px ${showGlow})drop-shadow(0 0 10px ${showGlow})`
                : 'none'
            };
            height: ${iconSize}px;
            width: ${iconSize}px;
          "
        />
        ${
          pkmn.seen_type === 'nearby_cell'
            ? /* html */ `
            <img
              src="${Icons.getMisc('grass')}"
              alt="nearby_cell"
              style="
                width: ${iconSize / 1.5}px;
                height: auto;
                bottom: ${(-iconSize / 5) * pokemonMod.offsetY}px;
                left: 10%;
              "
            />`
            : ''
        }
        ${
          badge
            ? /* html */ `
            <img
             src="${badge}"
             alt="${badge}"
             style="
               width: ${iconSize / 2}px;
               height: auto;
               bottom: ${(-iconSize / 5) * pokemonMod.offsetY}px;
               left: ${pokemonMod.offsetX * iconSize * 4}%;
             "
             />`
            : ''
        }
        ${
          showWeather
            ? /* html */ `
            <div
              class="weather-icon"
              style="
                width: ${Math.max(17, iconSize / 2)}px;
                height: ${Math.max(17, iconSize / 2)}px;
                top: ${-iconSize * pokemonMod.offsetY}px;
                left: ${pokemonMod.offsetX * iconSize * 5}%;
                display: flex;
                align-items: center;
                justify-content: center;
                border-width: ${Math.max(1, iconSize / 24)}px;
              "
            >
              <img
                src="${Icons.getWeather(pkmn.weather, timeOfDay)}"
                alt="${pkmn.weather}"
                class="${weatherMod.disableColorShift ? '' : 'fancy'}"
                style="
                  width: ${Math.max(10, iconSize / 3)}px;
                  height: ${Math.max(10, iconSize / 3)}px;
                "
              />
            </div>`
            : ''
        }
      </div>
    `,
  })
}

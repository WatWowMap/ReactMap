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
  levelCircle,
) => {
  const [pokemonMod, weatherMod] = Icons.getModifiers('pokemon', 'weather')
  const badge = getBadge(pkmn.bestPvp)

  const showSize =
    userSettings?.showSizeIndicator &&
    Number.isInteger(pkmn.size) &&
    pkmn.size !== 3

  return divIcon({
    popupAnchor: [
      0 + pokemonMod.popupX,
      size * -0.7 * pokemonMod.offsetY + pokemonMod.popupY,
    ],
    iconAnchor: [size / 2, 0],
    className: 'pokemon-marker',
    html: /* html */ `
      <div
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
            WebkitFilter: ${
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
         ivCircle && !badge
           ? /* html */ `
           <div
            class="iv-badge"
            style="
              bottom: ${(-size / 5) * pokemonMod.offsetY}px;
              left: ${pokemonMod.offsetX * size * 5}%;
            "
          >
            ${Math.round(pkmn.iv)}
          </div> `
           : ''
       }
        ${
          levelCircle && !badge
            ? /* html */ `
            <div
              class="iv-badge"
              style="
                bottom: ${(size / 1.5) * pokemonMod.offsetY}px;
                left: ${pokemonMod.offsetX * size * 5}%;
              "
            >
              L${Math.round(pkmn.level)}
            </div>`
            : ''
        }
       ${
         showSize
           ? /* html */ `
           <div
            class="iv-badge"
            style="
              bottom: ${(-size / 5) * pokemonMod.offsetY}px;
              right: ${pokemonMod.offsetX * size}%;
              fontSize: 10px;
            "
          >
            ${{ 1: 'XXS', 2: 'XS', 3: 'MD', 4: 'XL', 5: 'XXL' }[pkmn.size]}
          </div>`
           : ''
       }
        ${
          weatherCheck
            ? /* html */ `
            <div
              class="weather-icon"
              style="
                width: ${size / 2}px;
                height: ${size / 2}px;
                top: ${-size * pokemonMod.offsetY}px;
                right: 0;
                display: flex;
                align-items: center;
                justify-content: center;
              "
            >
              <img
                src="${Icons.getWeather(pkmn.weather, timeOfDay)}"
                alt="${pkmn.weather}"
                class="${weatherMod.disableColorShift ? '' : 'fancy'}"
                style="
                  width: ${size / 3}px;
                  height: ${size / 3}px;
                "
              />
            </div>`
            : ''
        }
      </div>
    `,
  })
}

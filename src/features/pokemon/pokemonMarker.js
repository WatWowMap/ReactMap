// @ts-check

import { Icon, divIcon } from 'leaflet'

import { useMemory } from '@store/useMemory'

/** Room around the icon for the glow, the split glow's mask must not cut it */
const GLOW_PAD = 20

/**
 * The icon with a glow that fades from `left` to `right`; drawn below the
 * unfiltered icon, positioned like the marker's own `<img>` (left/bottom 0)
 * @param {string} iconUrl
 * @param {number} iconSize
 * @param {string} color
 * @param {'left' | 'right'} side
 */
const halfGlow = (iconUrl, iconSize, color, side) => {
  const mask = `linear-gradient(90deg, ${
    side === 'left' ? '#000 35%, transparent 65%' : 'transparent 35%, #000 65%'
  })`
  return /* html */ `
    <div
      style="
        position: absolute;
        left: ${-GLOW_PAD}px;
        bottom: ${-GLOW_PAD}px;
        width: ${iconSize + GLOW_PAD * 2}px;
        height: ${iconSize + GLOW_PAD * 2}px;
        pointer-events: none;
        -webkit-mask-image: ${mask};
        mask-image: ${mask};
      "
    >
      <img
        src="${iconUrl}"
        alt=""
        style="
          position: absolute;
          left: ${GLOW_PAD}px;
          bottom: ${GLOW_PAD}px;
          height: ${iconSize}px;
          width: ${iconSize}px;
          filter: drop-shadow(0 0 10px ${color})drop-shadow(0 0 10px ${color});
        "
      />
    </div>`
}

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

/**
 * @typedef {Object} FancyPokemonMarkerProps
 * @property {import('@rm/types').Pokemon} pkmn
 * @property {string} iconUrl
 * @property {number} iconSize
 * @property {string} showGlow
 * @property {string} [splitGlow] second glow colour, shown on the right half
 * @property {boolean} showWeather
 * @property {string} badge
 * @property {number} opacity
 * @property {import('@rm/types').TimesOfDay} timeOfDay
 * @property {string} [backgroundUrl]
 * @property {boolean} [sparkle] draws shiny stars on the icon
 * @param {FancyPokemonMarkerProps} props
 */
export const fancyPokemonMarker = ({
  pkmn,
  iconUrl,
  iconSize,
  showGlow,
  splitGlow,
  showWeather,
  badge,
  opacity,
  timeOfDay,
  backgroundUrl,
  sparkle = false,
}) => {
  const split = !!(showGlow && splitGlow)
  const filter =
    showGlow && !split
      ? `drop-shadow(0 0 10px ${showGlow})drop-shadow(0 0 10px ${showGlow})`
      : 'none'
  const { Icons } = useMemory.getState()
  const [pokemonMod, weatherMod] = Icons.getModifiers('pokemon', 'weather')
  const pokemonBackground = backgroundUrl || ''
  // with a background box the glow goes on the box instead of the sprite
  const glowUrl = pokemonBackground || iconUrl

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
        ${
          split
            ? halfGlow(glowUrl, iconSize, showGlow, 'left') +
              halfGlow(glowUrl, iconSize, splitGlow, 'right')
            : ''
        }
        ${
          pokemonBackground
            ? /* html */ `
        <img
          src="${pokemonBackground}"
          alt="background-${pkmn.background || 'override'}"
          style="
            -webkit-filter: ${filter};
            filter: ${filter};
            height: ${iconSize}px;
            width: ${iconSize}px;
          "
        />`
            : ''
        }
        <img
          src="${iconUrl}"
          alt="${pkmn.pokemon_id}"
          style="
            -webkit-filter: ${pokemonBackground ? 'none' : filter};
            filter: ${pokemonBackground ? 'none' : filter};
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
          sparkle
            ? /* html */ `
            <span
              class="personal-shiny-sparkle"
              style="
                position: absolute;
                top: ${-iconSize * 0.35 * pokemonMod.offsetY}px;
                right: ${-iconSize * 0.15}px;
                font-size: ${Math.max(12, iconSize / 2.2)}px;
                line-height: 1;
                pointer-events: none;
              "
            >✨</span>`
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

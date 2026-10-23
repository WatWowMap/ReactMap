// @ts-check

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

/** inner and outer glow colors for each sparkle tier */
const SPARKLE_GLOW = {
  high: ['#FFF3BF', '#FFD54A'],
  shundo: ['#FFB3EC', '#B26BFF'],
}

/**
 * Kept out of the top right corner, where the weather boost icon sits
 * @type {[number, number, number, number][]} left %, top %, size em, delay s
 */
const SPARKLE_STARS = [
  [6, 10, 0.24, 0],
  [84, 62, 0.17, 0.55],
  [-2, 52, 0.21, 1.1],
  [30, -8, 0.15, 1.65],
  [8, 84, 0.13, 0.85],
  [62, 84, 0.14, 1.95],
]

/** @param {number} count */
const sparkleStars = (count) => /* html */ `
  <span class="shiny-sparkle__stars">${SPARKLE_STARS.slice(0, count)
    .map(
      ([left, top, size, delay]) =>
        `<span style="left:${left}%;top:${top}%;--star-size:${size}em;--star-delay:${delay}s"></span>`,
    )
    .join('')}</span>`

/**
 * Spreads markers across the animation cycle so they don't pulse in unison
 * @param {string} id
 */
const getSparkleOffset = (id) => {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 2400
  }
  return -hash / 1000
}

/**
 * @param {'high' | 'shundo'} tier
 * @param {'back' | 'front'} side
 * @param {{ id: string, iconUrl: string, iconSize: number }} props
 */
const sparkleLayer = (tier, side, { id, iconUrl, iconSize }) => {
  const layers =
    tier === 'shundo'
      ? side === 'back'
        ? /* html */ `
          <span class="shiny-sparkle__aura"></span>
          <span class="shiny-sparkle__halo shiny-sparkle__halo--bloom"></span>
          <span class="shiny-sparkle__halo"></span>`
        : /* html */ `
          <span class="shiny-sparkle__sheen"></span>
          ${sparkleStars(6)}`
      : side === 'back'
        ? /* html */ `
          <span class="shiny-sparkle__pool"></span>
          <span class="shiny-sparkle__ripple"></span>
          <span class="shiny-sparkle__ripple" style="--ripple-delay:0.8s"></span>
          <span class="shiny-sparkle__ripple" style="--ripple-delay:1.6s"></span>`
        : sparkleStars(2)

  return /* html */ `
    <div
      class="shiny-sparkle ${tier}"
      style="
        width: ${iconSize}px;
        height: ${iconSize}px;
        font-size: ${iconSize}px;
        --sparkle-offset: ${getSparkleOffset(id)}s;
        --sparkle-sprite: url('${iconUrl}');
      "
    >${layers}</div>`
}

/**
 * @typedef {Object} FancyPokemonMarkerProps
 * @property {import('@rm/types').Pokemon} pkmn
 * @property {string} iconUrl
 * @property {number} iconSize
 * @property {string} showGlow
 * @property {boolean} showWeather
 * @property {string} badge
 * @property {number} opacity
 * @property {import('@rm/types').TimesOfDay} timeOfDay
 * @property {string} [backgroundUrl]
 * @property {'high' | 'shundo'} [sparkle]
 * @param {FancyPokemonMarkerProps} props
 */
export const fancyPokemonMarker = ({
  pkmn,
  iconUrl,
  iconSize,
  showGlow,
  showWeather,
  badge,
  opacity,
  timeOfDay,
  backgroundUrl,
  sparkle,
}) => {
  const { Icons } = useMemory.getState()
  const [pokemonMod, weatherMod] = Icons.getModifiers('pokemon', 'weather')
  const pokemonBackground = backgroundUrl || ''
  const glowFilter = sparkle
    ? `drop-shadow(0 0 ${iconSize * 0.05}px ${SPARKLE_GLOW[sparkle][0]})drop-shadow(0 0 ${iconSize * 0.1}px ${SPARKLE_GLOW[sparkle][1]})`
    : showGlow
      ? `drop-shadow(0 0 10px ${showGlow})drop-shadow(0 0 10px ${showGlow})`
      : 'none'
  const sparkleProps = { id: `${pkmn.id}`, iconUrl, iconSize }

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
          pokemonBackground
            ? /* html */ `
        <img
          src="${pokemonBackground}"
          alt="background-${pkmn.background || 'override'}"
          style="
            -webkit-filter: ${glowFilter};
            filter: ${glowFilter};
            height: ${iconSize}px;
            width: ${iconSize}px;
          "
        />`
            : ''
        }
        ${sparkle ? sparkleLayer(sparkle, 'back', sparkleProps) : ''}
        <img
          src="${iconUrl}"
          alt="${pkmn.pokemon_id}"
          style="
            -webkit-filter: ${pokemonBackground ? 'none' : glowFilter};
            filter: ${pokemonBackground ? 'none' : glowFilter};
            height: ${iconSize}px;
            width: ${iconSize}px;
          "
        />
        ${sparkle ? sparkleLayer(sparkle, 'front', sparkleProps) : ''}
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

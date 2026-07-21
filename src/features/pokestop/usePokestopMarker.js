// @ts-check
import { divIcon } from 'leaflet'

import { basicEqualFn, useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useOpacity } from '@hooks/useOpacity'
import { getRewardInfo } from '@utils/getRewardInfo'
import { INCIDENT_DISPLAY_TYPES } from './incidentPriority'
import { resolveShowcaseEventIcon } from './resolveShowcaseEventIcon'

const INVASION_REWARD_SLOTS = [
  {
    flag: 'firstReward',
    id: 'slot_1_pokemon_id',
    form: 'slot_1_form',
    encounters: 'first',
  },
  {
    flag: 'secondReward',
    id: 'slot_2_pokemon_id',
    form: 'slot_2_form',
    encounters: 'second',
  },
  {
    flag: 'thirdReward',
    id: 'slot_3_pokemon_id',
    form: 'slot_3_form',
    encounters: 'third',
  },
]

/**
 * @param {import('@rm/types').Invasion} invasion
 * @param {import('@rm/masterfile').Invasion | undefined} gruntData
 * @returns {{ id: number, form: number }[]}
 */
function getInvasionRewardCandidates(invasion, gruntData) {
  if (!invasion.confirmed && Number(invasion.grunt_type) === 44) return []

  const candidates = new Map()
  const addCandidate = (id, form) => {
    const pokemonId = Number(id)
    if (!pokemonId) return
    const formId = Number(form) || 0
    candidates.set(`${pokemonId}-${formId}`, { id: pokemonId, form: formId })
  }
  INVASION_REWARD_SLOTS.forEach((slot) => {
    if (!gruntData?.[slot.flag]) return
    if (invasion.confirmed && Number(invasion[slot.id])) {
      addCandidate(invasion[slot.id], invasion[slot.form])
    } else {
      gruntData.encounters?.[slot.encounters]?.forEach((encounter) => {
        addCandidate(encounter.id, encounter.form)
      })
    }
  })

  return [...candidates.values()]
}

/**
 * @param {{ id: number, form: number }} candidate
 * @param {import('@rm/types').AllFilters['pokestops']['filter']} filters
 * @param {import('@store/useMemory').UseMemory['Icons']} Icons
 * @param {'invasion' | 'reward'} sizeCategory
 * @returns {number}
 */
function getInvasionRewardSize(candidate, filters, Icons, sizeCategory) {
  const pokemonKey = `a${candidate.id}-${candidate.form || 0}`
  const pokemonKeySimple = `a${candidate.id}`
  const pokemonFilter = filters[pokemonKey]
  const simplePokemonFilter = filters[pokemonKeySimple]

  if (pokemonFilter?.enabled) {
    return Icons.getSize(sizeCategory, pokemonFilter.size)
  }
  return simplePokemonFilter?.enabled
    ? Icons.getSize(sizeCategory, simplePokemonFilter.size)
    : 0
}

/**
 *
 * @param {{
 *  hasQuest: boolean,
 *  hasLure: boolean,
 *  markerEvents: Array<{ display_type?: number | string | null }>,
 *  markerInvasions: Array<import('@rm/types').Invasion>,
 *  baseIncidentDisplay: number | string,
 * } & import('@rm/types').Pokestop} param0
 * @returns
 */
export function usePokestopMarker({
  hasQuest,
  hasLure,
  lure_id,
  ar_scan_eligible,
  power_up_level,
  quests,
  markerEvents,
  markerInvasions,
  baseIncidentDisplay,
}) {
  const [, Icons, masterfile] = useStorage(
    (s) => [
      s.icons,
      useMemory.getState().Icons,
      useMemory.getState().masterfile,
    ],
    (a, b) => Object.entries(a[0]).every(([k, v]) => b[0][k] === v),
  )

  const hasVisibleInvasion = markerInvasions.some(
    (invasion) => !!invasion.grunt_type,
  )
  const shouldShowStandaloneKecleonBadge =
    !hasQuest &&
    !hasVisibleInvasion &&
    markerEvents.length > 0 &&
    markerEvents.every(
      (event) =>
        Number(event.display_type ?? 0) === INCIDENT_DISPLAY_TYPES.KECLEON,
    )

  const getOpacity = useOpacity('pokestops', 'invasion')
  const hasDualQuestLayer = useMemory(
    (s) => s.config.misc.questLayerMode === 'dual',
  )
  const [
    showArBadge,
    showArQuestDotBadge,
    showNoArQuestDotBadge,
    showInvasionRewardMarker,
    baseIcon,
    baseSize,
  ] = useStorage((s) => {
    const { filters, userSettings } = s
    const pokestops = userSettings.pokestops || {}
    const showAr = hasDualQuestLayer && pokestops.showArBadge
    return [
      showAr,
      hasDualQuestLayer && (pokestops.showArQuestDotBadge ?? false),
      hasDualQuestLayer && (pokestops.showNoArQuestDotBadge ?? false),
      !!pokestops.invasionRewardMarker,
      Icons.getPokestops(
        hasLure ? lure_id : 0,
        hasVisibleInvasion,
        hasQuest && pokestops.hasQuestIndicator,
        ar_scan_eligible && (showAr || !!power_up_level),
        power_up_level,
        baseIncidentDisplay,
      ),
      hasLure
        ? Icons.getSize(
            'pokestop',
            filters.pokestops.filter[`l${lure_id}`]?.size,
          )
        : Icons.getSize('pokestop', filters.pokestops.filter.s0?.size),
    ]
  }, basicEqualFn)
  const filters = useStorage((s) => s.filters.pokestops.filter)

  const [invasionMod, pokestopMod, rewardMod, eventMod] = Icons.getModifiers(
    'invasion',
    'pokestop',
    'reward',
    'event',
  )

  let popupYOffset = 1.3
  let popupX = 7 + pokestopMod.popupX
  let { popupY } = pokestopMod

  const invasionIcons = []
  const invasionSizes = []
  const questIcons = []
  const questSizes = []
  const eventIcons = []
  const eventSizes = []

  if (hasVisibleInvasion) {
    markerInvasions.forEach((invasion) => {
      if (invasion.grunt_type) {
        const gruntData = masterfile.invasions[invasion.grunt_type]
        const rewardCandidates = getInvasionRewardCandidates(
          invasion,
          gruntData,
        )
        const uniqueReward = rewardCandidates.length === 1
        const showRewardMarker = showInvasionRewardMarker && uniqueReward
        const invasionSizeCategory = showRewardMarker ? 'reward' : 'invasion'
        const invasionIcon = showRewardMarker
          ? Icons.getPokemon(
              rewardCandidates[0].id,
              rewardCandidates[0].form,
              0,
              0,
              0,
              1,
            )
          : Icons.getInvasions(invasion.grunt_type, invasion.confirmed)

        invasionIcons.unshift({
          icon: invasionIcon,
          opacity: getOpacity(invasion.incident_expire_timestamp),
        })

        // Get base invasion type icon size
        const invasionTypeSize = Icons.getSize(
          invasionSizeCategory,
          filters[`i${invasion.grunt_type}`]?.size,
        )

        // Exclude leaders and Giovanni (grunt_type 41-44) from size calculation
        if (invasion.grunt_type >= 41 && invasion.grunt_type <= 44) {
          invasionSizes.unshift(invasionTypeSize)
        } else {
          // Calculate potential reward icon sizes
          let maxRewardSize = 0

          // Only consider invasion type size if the invasion type is enabled
          if (filters[`i${invasion.grunt_type}`]?.enabled) {
            maxRewardSize = Math.max(maxRewardSize, invasionTypeSize)
          }

          rewardCandidates.forEach((candidate) => {
            maxRewardSize = Math.max(
              maxRewardSize,
              getInvasionRewardSize(
                candidate,
                filters,
                Icons,
                invasionSizeCategory,
              ),
            )
          })

          // Use the maximum size found, or default invasion size if none are enabled
          const finalInvasionSize =
            maxRewardSize > 0 ? maxRewardSize : invasionTypeSize
          invasionSizes.unshift(finalInvasionSize)
        }

        popupYOffset += invasionMod.offsetY - 1
        popupX += invasionMod.popupX
        popupY += invasionMod.popupY
      }
    })
  }

  if (hasQuest && !(hasVisibleInvasion && invasionMod?.removeQuest)) {
    quests.forEach((quest) => {
      const { quest_reward_type, quest_background, with_ar = true, key } = quest
      const showQuestDot = with_ar ? showArQuestDotBadge : showNoArQuestDotBadge
      const { src: url, amount } = getRewardInfo(quest, {
        preferAmountIcon: true,
      })
      questIcons.unshift({
        url,
        amount,
        backgroundUrl:
          quest_reward_type === 7 ? Icons.getBackground(quest_background) : '',
        rewardType: quest_reward_type === 20 ? 12 : quest_reward_type,
        questDotColor: showQuestDot ? (with_ar ? '#1e88e5' : '#9e9e9e') : '',
      })
      questSizes.unshift(Icons.getSize('reward', filters[key]?.size))
      popupYOffset += rewardMod.offsetY - 1
      popupX += rewardMod.popupX
      popupY += rewardMod.popupY
    })
  }
  if (markerEvents.length && !hasQuest) {
    markerEvents.forEach((event) => {
      const displayType = Number(event.display_type ?? 0)
      if (displayType === INCIDENT_DISPLAY_TYPES.KECLEON) {
        if (!shouldShowStandaloneKecleonBadge || eventIcons.length) {
          return
        }
        eventIcons.unshift({
          url: Icons.getPokemon(352),
        })
        eventSizes.unshift(
          Icons.getSize(
            'event',
            filters[`b${INCIDENT_DISPLAY_TYPES.KECLEON}`]?.size,
          ),
        )
      } else if (displayType === INCIDENT_DISPLAY_TYPES.SHOWCASE) {
        const showcaseIcon = resolveShowcaseEventIcon(event, Icons)
        eventIcons.unshift({
          url: showcaseIcon.url,
          decoration: showcaseIcon.decoration,
        })
        eventSizes.unshift(
          Icons.getSize('event', filters[showcaseIcon.sizeFilterKey]?.size),
        )
      } else {
        eventIcons.unshift({
          url: Icons.getEventStops(displayType),
        })
        eventSizes.unshift(
          Icons.getSize('event', filters[`b${displayType}`]?.size),
        )
      }
      popupYOffset += eventMod.offsetY - 1
      popupX += eventMod.popupX
      popupY += eventMod.popupY
    })
  }
  const totalQuestSize = questSizes.reduce((a, b) => a + b, 0)
  const totalInvasionSize = invasionSizes.reduce((a, b) => a + b, 0)
  const totalEventSize = eventSizes.length
    ? eventSizes.reduce((a, b) => a + b, -3)
    : 0

  const showAr = showArBadge && ar_scan_eligible && !baseIcon.includes('_ar')

  const stackItems = []

  invasionIcons.forEach((invasion, index) => {
    stackItems.push({
      type: 'invasion',
      url: invasion.icon,
      size: invasionSizes[index],
      modifier: invasionMod,
      opacity: invasion.opacity,
    })
  })

  questIcons.forEach((icon, index) => {
    stackItems.push({
      type: 'quest',
      url: icon.url,
      size: questSizes[index],
      modifier: rewardMod,
      amount: icon.amount,
      rewardType: icon.rewardType,
      backgroundUrl: icon.backgroundUrl,
      questDotColor: icon.questDotColor,
    })
  })

  eventIcons.forEach((icon, index) => {
    stackItems.push({
      type: 'event',
      url: icon.url,
      size: eventSizes[index],
      modifier: eventMod,
      decoration: icon.decoration,
    })
  })

  const stackBottom = stackItems.length
    ? invasionIcons.length
      ? baseSize * 0.5 * invasionMod.offsetY
      : questIcons.length
        ? baseSize * 0.6 * rewardMod.offsetY
        : baseSize * 0.6 * eventMod.offsetY
    : 0

  const stackMarkup = stackItems
    .map((item) => {
      const amountHtml =
        item.type === 'quest' && item.amount
          ? `
                <span class="pokestop-marker__amount">
                  x${item.amount}
                </span>
              `
          : ''
      const opacityStyle =
        typeof item.opacity === 'number' ? `opacity: ${item.opacity};` : ''
      const decorationHtml =
        item.type === 'event' && item.decoration
          ? `
                <img
                  src="${Icons.getMisc('showcase')}"
                  alt="showcase"
                  class="pokestop-marker__decoration"
                  style="width: ${item.size * 0.66}px; height: ${
                    item.size * 0.66
                  }px;"
                />
              `
          : ''
      const questDotHtml =
        item.type === 'quest' && item.questDotColor
          ? `
                <span
                  class="pokestop-marker__quest-dot"
                  style="background-color: ${item.questDotColor};"
                ></span>
              `
          : ''
      const backgroundStyle = item.backgroundUrl
        ? `
                background-image: url(${item.backgroundUrl});
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
                width: ${item.size}px;
                height: ${item.size}px;
                display: flex;
                align-items: center;
                justify-content: center;
              `
        : ''
      return `
            <div
              class="pokestop-marker__stack-item pokestop-marker__stack-item--${
                item.type
              }"
              data-reward-type="${
                typeof item.rewardType !== 'undefined' ? item.rewardType : ''
              }"
              style="
                --marker-size: ${item.size}px;
                left: ${item.modifier.offsetX * 50}%;
                ${backgroundStyle}
              "
            >
              <img
                src="${item.url}"
                alt="${item.url}"
                style="${opacityStyle}"
              />
              ${amountHtml}
              ${questDotHtml}
              ${decorationHtml}
            </div>
      `
    })
    .join('')

  const stackHtml = stackItems.length
    ? `
          <div
            class="pokestop-marker__stack"
            style="
              bottom: ${stackBottom}px;
            "
          >
            ${stackMarkup}
          </div>
        `
    : ''

  return divIcon({
    popupAnchor: [
      popupX - 5,
      (pokestopMod.manualPopup
        ? pokestopMod.manualPopup -
          totalInvasionSize * 0.25 -
          totalQuestSize * 0.1
        : -(baseSize + totalInvasionSize + totalQuestSize + totalEventSize) /
          popupYOffset) + popupY,
    ],
    className: 'pokestop-marker',
    html: /* html */ `
      <div class="marker-image-holder top-overlay">
        <img
          src="${baseIcon}"
          alt="${baseIcon}"
          style="
            width: ${baseSize}px;
            height: ${baseSize}px;
            bottom: ${2 + pokestopMod.offsetY}px;
            left: ${pokestopMod.offsetX * 50}%;
            transform: translateX(-50%);
          "
        />
        ${
          showAr
            ? `
              <img
                src="${Icons.getMisc('ar')}"
                alt="ar"
                style="
                  width: ${baseSize / 2}px;
                  height: auto;
                  bottom: ${23 + pokestopMod.offsetY}px;
                  left: ${pokestopMod.offsetX * 10}%;
                  transform: translateX(-50%);
                "
              />
            `
            : ''
        }
        ${stackHtml}
        </div>`,
  })
}

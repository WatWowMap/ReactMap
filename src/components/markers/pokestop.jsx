/* eslint-disable camelcase */
import React from 'react'
import { renderToString } from 'react-dom/server'
import L from 'leaflet'

export default function stopMarker(pokestop, hasQuest, hasLure, hasInvasion, filters, Icons, userSettings) {
  const { lure_id, ar_scan_eligible } = pokestop
  const { invasion: invasionMod, pokestop: pokestopMod, reward: rewardMod } = Icons.modifiers

  let filterId = 's0'
  let popupYOffset = 1.3
  const baseIcon = Icons.getPokestops(
    hasLure ? lure_id : 0, hasInvasion,
    (hasQuest && userSettings.hasQuestIndicator),
    (userSettings.showArBadge && ar_scan_eligible),
  )
  let baseSize = Icons.getSize('pokestop', filters.filter[filterId])
  const invasionIcons = []
  const invasionSizes = []
  const questIcons = []
  const questSizes = []

  if (hasLure) {
    filterId = `l${lure_id}`
    baseSize = Icons.getSize('pokestop', filters.filter[filterId])
  }
  if (hasInvasion) {
    const { invasions } = pokestop
    invasions.forEach(invasion => {
      filterId = `i${invasion.grunt_type}`
      invasionIcons.unshift(Icons.getInvasions(invasion.grunt_type))
      invasionSizes.unshift(Icons.getSize('invasion', filters.filter[filterId]))
      popupYOffset += rewardMod.offsetY - 1
    })
  }
  if (hasQuest && !(hasInvasion && invasionMod.removeQuest)) {
    const { quests } = pokestop

    quests.forEach(quest => {
      const {
        quest_item_id,
        item_amount,
        stardust_amount,
        candy_pokemon_id,
        candy_amount,
        mega_pokemon_id,
        mega_amount,
        quest_reward_type,
        quest_pokemon_id,
        quest_form_id,
        quest_gender_id,
        quest_costume_id,
        quest_shiny,
        key,
      } = quest
      switch (quest_reward_type) {
        case 2:
          questIcons.unshift(Icons.getRewards(quest_reward_type, quest_item_id, item_amount)); break
        case 3:
          questIcons.unshift(Icons.getRewards(quest_reward_type, stardust_amount)); break
        case 4:
          questIcons.unshift(Icons.getRewards(quest_reward_type, candy_pokemon_id, candy_amount)); break
        case 7:
          questIcons.unshift(Icons.getPokemon(
            quest_pokemon_id, quest_form_id, 0, quest_gender_id, quest_costume_id, quest_shiny,
          )); break
        case 12:
          questIcons.unshift(Icons.getRewards(quest_reward_type, mega_pokemon_id, mega_amount)); break
        default:
          questIcons.unshift(Icons.getRewards(quest_reward_type))
      }
      questSizes.unshift(Icons.getSize('reward', filters.filter[key]))
      popupYOffset += rewardMod.offsetY - 1
    })
  }

  const totalQuestSize = questSizes.reduce((a, b) => a + b, 0)
  const totalInvasionSize = invasionSizes.reduce((a, b) => a + b, 0)

  const ReactIcon = (
    <div className="marker-image-holder top-overlay">
      <img
        src={baseIcon}
        style={{
          width: baseSize,
          height: baseSize,
          bottom: -1 + pokestopMod.offsetY,
          left: `${pokestopMod.offsetX * 100}%`,
          transform: 'translateX(-50%)',
        }}
      />
      {Boolean(userSettings.showArBadge && ar_scan_eligible && !baseIcon.includes('_ar')) && (
        <img
          src={Icons.getMisc('ar')}
          style={{
            width: baseSize / 2,
            height: 'auto',
            bottom: 20 + pokestopMod.offsetY,
            left: `${pokestopMod.offsetX * 10}%`,
            transform: 'translateX(-50%)',
          }}
        />
      )}
      {questIcons.map((icon, i) => (
        <img
          key={icon}
          src={icon}
          style={{
            width: questSizes[i],
            height: questSizes[i],
            bottom: (baseSize * 0.6 + (invasionMod.removeQuest ? 10 : totalInvasionSize))
              * rewardMod.offsetY
              + (questSizes[i] * i),
            left: `${rewardMod.offsetX * 100}%`,
            transform: 'translateX(-50%)',
          }}
        />
      ))}
      {invasionIcons.map((icon, i) => (
        <img
          key={icon}
          src={icon}
          style={{
            width: invasionSizes[i],
            height: invasionSizes[i],
            bottom: baseSize * 0.5 * invasionMod.offsetY
              + (invasionSizes[i] * i),
            left: `${invasionMod.offsetX * 100}%`,
            transform: 'translateX(-50%)',
          }}
        />
      ))}
    </div>
  )

  const getPopupAnchorY = () => {
    if (pokestopMod.manualPopup) {
      return pokestopMod.manualPopup - totalInvasionSize * 0.25 - totalQuestSize * 0.1
    }
    return -(baseSize + totalInvasionSize + totalQuestSize) / popupYOffset
  }

  return L.divIcon({
    popupAnchor: [7, getPopupAnchorY()],
    className: 'pokestop-marker',
    html: renderToString(ReactIcon),
  })
}

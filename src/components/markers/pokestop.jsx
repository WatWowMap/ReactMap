/* eslint-disable camelcase */
import React from 'react'
import { renderToString } from 'react-dom/server'
import L from 'leaflet'

export default function stopMarker(pokestop, hasQuest, hasLure, hasInvasion, filters, Icons) {
  const { grunt_type, lure_id } = pokestop
  const { invasion: invasionMod, pokestop: pokestopMod, reward: rewardMod } = Icons.modifiers

  let filterId = 's0'
  let popupYOffset = 1.3
  const baseIcon = Icons.getPokestops(hasLure ? lure_id : 0, hasInvasion, hasQuest)
  let baseSize = Icons.getSize('pokestop', filters.filter[filterId])
  let invasionIcon
  let invasionSize = 10
  const questIcons = []
  const questSizes = []

  if (hasLure) {
    filterId = `l${lure_id}`
    baseSize = Icons.getSize('pokestop', filters.filter[filterId])
  }
  if (hasInvasion) {
    invasionIcon = Icons.getInvasions(grunt_type)
    filterId = `i${grunt_type}`
    invasionSize = Icons.getSize('invasion', filters.filter[filterId])
    popupYOffset += invasionMod.offsetY - 1
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
      {questIcons.map((icon, i) => (
        <img
          key={icon}
          src={icon}
          style={{
            width: questSizes[i],
            height: questSizes[i],
            bottom: (baseSize * 0.6 + (invasionMod.removeQuest ? 10 : invasionSize))
              * rewardMod.offsetY
              + (questSizes[i] * i),
            left: `${rewardMod.offsetX * 100}%`,
            transform: 'translateX(-50%)',
          }}
        />
      ))}
      {invasionIcon && (
        <img
          src={invasionIcon}
          style={{
            width: invasionSize,
            height: invasionSize,
            bottom: baseSize * 0.5 * invasionMod.offsetY,
            left: `${invasionMod.offsetX * 100}%`,
            transform: 'translateX(-50%)',
          }}
        />
      )}
    </div>
  )

  const getPopupAnchorY = () => {
    const totalQuestSize = questSizes.reduce((a, b) => a + b, 0)
    if (pokestopMod.manualPopup) {
      return pokestopMod.manualPopup - invasionSize * 0.25 - totalQuestSize * 0.1
    }
    return -(baseSize + invasionSize + totalQuestSize) / popupYOffset
  }

  return L.divIcon({
    popupAnchor: [7, getPopupAnchorY()],
    className: 'pokestop-marker',
    html: renderToString(ReactIcon),
  })
}

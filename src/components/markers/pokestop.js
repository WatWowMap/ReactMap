/* eslint-disable camelcase */
import L from 'leaflet'
import Utility from '../../services/Utility'

export default function stopMarker(pokestop, hasQuest, hasLure, hasInvasion, filters,
                                   iconSizes, path, iconModifiers, availableForms) {
  const { grunt_type, lure_id } = pokestop

  let iconType = 'pokestop/0'
  let filterId = 's0'
  const lureId = lure_id ? lure_id.toString().slice(-1) : 0
  let iconHtml = ''
  if (hasLure && hasInvasion) {
    iconType = `invasion/i${lureId}_${grunt_type}`
    filterId = `i${grunt_type}`
  } else if (hasLure) {
    iconType = `pokestop/${lureId}`
    filterId = `l${lure_id}`
  } else if (hasInvasion) {
    iconType = `invasion/i_${grunt_type}`
    filterId = `i${grunt_type}`
  }
  const stopSize = filters.filter[filterId] ? iconSizes[filters.filter[filterId].size] : iconSizes.md
  const iconAnchorY = stopSize * 0.896
  let popupAnchorY = -8 - iconAnchorY

  if (hasQuest) {
    const {
      quest_reward_type: rewardType,
      quest_item_id: itemId,
      item_amount: itemAmount,
      stardust_amount: stardustAmount,
      quest_pokemon_id: pokemonId,
      quest_form_id: formId,
      quest_gender_id: genderId,
      quest_costume_id: costumeId,
      quest_shiny: shiny,
      mega_pokemon_id: megaId,
      mega_amount: megaAmount,
    } = pokestop
    let iconUrl = '/images/pokestop/0.png'

    switch (rewardType) {
      default: iconUrl = '/images/item/-0.png'; break
      case 1:
        iconUrl = '/images/item/-2.png'
        if (itemAmount > 1) {
          iconHtml = `<div class="amount-holder"><div>${itemAmount}</div></div>`
        } break
      case 2:
        filterId = `q${itemId}`
        iconUrl = `/images/item/${itemId}.png`
        if (itemAmount > 1) {
          iconHtml = `<div class="amount-holder"><div>${itemAmount}</div></div>`
        } break
      case 3:
        filterId = `d${stardustAmount}`
        iconUrl = '/images/item/-1.png'
        if (stardustAmount > 1) {
          iconHtml = `<div class="amount-holder"><div>${stardustAmount}</div></div>`
        } break
      case 4:
        iconUrl = '/images/item/-3.png'
        if (itemAmount > 1) {
          iconHtml = `<div class="amount-holder"><div>${itemAmount}</div></div>`
        } break
      case 5: iconUrl = '/images/item/-4.png'; break
      case 6: iconUrl = '/images/item/-5.png'; break
      case 7:
        filterId = `${pokemonId}-${formId}`
        iconUrl = `${path}/${Utility.getPokemonIcon(availableForms, pokemonId, formId, 0, genderId, costumeId, shiny)}.png`; break
      case 8: iconUrl = '/images/item/-6.png'; break
      case 11: iconUrl = '/images/item/-7.png'; break
      case 12:
        filterId = `m${megaId}-${megaAmount}`
        iconUrl = '/images/item/-8.png'
        iconHtml = `
          <img 
            src=${path}/${Utility.getPokemonIcon(availableForms, megaId, 0, 1)}.png 
            style="bottom: 15px; 
              width:${iconModifiers.sizeMultiplier ? iconSizes[filters.filter[filterId].size] * iconModifiers.sizeMultiplier : iconSizes[filters.filter[filterId].size]}px; 
              height:${iconModifiers.sizeMultiplier ? iconSizes[filters.filter[filterId].size] * iconModifiers.sizeMultiplier : iconSizes[filters.filter[filterId].size]}px;"
          />`
        if (megaAmount > 1) {
          iconHtml += `<div class="amount-holder"><div>${megaAmount}</div></div>`
        } break
    }
    const questSize = (filters.filter[filterId] ? iconSizes[filters.filter[filterId].size]
      : iconSizes.md) * (iconModifiers.sizeMultiplier ? iconModifiers.sizeMultiplier : 1)
    const offsetY = iconModifiers.offsetY ? -stopSize * iconModifiers.offsetY : 0 - questSize
    iconHtml = `
      <div 
        class="marker-image-holder top-overlay" 
        style="width:${questSize}px;
        height:${questSize}px;
        left:${iconModifiers.offsetX ? iconModifiers.offsetX * 100 : 50}%;
        transform:translateX(-50%);
        top:${offsetY}px;"
      >
        <img 
          src="${iconUrl}"
          style="width:${questSize}px;
            height:${questSize}px;"
        />
        ${iconHtml}
      </div>`
    popupAnchorY += offsetY
  }

  return L.divIcon({
    iconSize: [stopSize, stopSize],
    iconAnchor: [stopSize / 2, iconAnchorY],
    popupAnchor: [0, popupAnchorY],
    className: 'pokestop-marker',
    html: `
      <div class="marker-image-holder">
        <img 
          src="/images/${iconType}.png"
          style="width:${stopSize}px;
            height:${stopSize}px;"
        />
      </div>${iconHtml}`,
  })
}

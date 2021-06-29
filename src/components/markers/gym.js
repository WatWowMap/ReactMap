/* eslint-disable camelcase */
import L from 'leaflet'
import Utility from '../../services/Utility'

const getBadgeColor = (raidLevel) => {
  switch (raidLevel) {
    default: return '#292929'
    case 1:
    case 2: return '#BF05C6'
    case 3:
    case 4: return '#9E8A09'
    case 5: return '#088DB6'
    case 6: return '#21BD21'
  }
}

export default function gymMarker(
  gym, ts, hasRaid, iconSizes, filters, path, iconModifiers, availableForms, userSettings,
) {
  const {
    in_battle, team_id, availble_slots, raid_level, ex_raid_eligible,
  } = gym

  const inBattle = in_battle ? 'battle' : 'gym'
  const teamId = team_id || 0
  let filledSlots = 6 - availble_slots || 0
  if (!teamId) filledSlots = 0

  let filterId = teamId === 0 ? `t${teamId}-0` : `g${teamId}-${filledSlots || 0}`
  const gymSize = filters.filter[filterId] ? iconSizes[filters.filter[filterId].size] : iconSizes.md
  const iconAnchorY = gymSize * 0.849
  let popupAnchorY = -8 - iconAnchorY

  let iconHtml = `
    <div class="marker-image-holder">
      <img 
        src="/images/${inBattle}/${teamId}_${filledSlots}.png"
        style="width:${gymSize}px; 
        height:${gymSize}px;"
      />
    </div>`

  let raidIcon
  let raidSize = 0
  if (hasRaid) {
    const {
      raid_battle_timestamp,
      raid_pokemon_id,
      raid_pokemon_evolution,
      raid_pokemon_costume,
      raid_pokemon_gender,
      raid_pokemon_form,
    } = gym
    filterId = `e${raid_level}`
    raidSize = filters.filter[filterId] ? iconSizes[filters.filter[filterId].size] : iconSizes.md
    raidIcon = `/images/egg/${raid_level}.png`
    if (raid_pokemon_id > 0) {
      filterId = `${raid_pokemon_id}-${raid_pokemon_form}`
      raidSize = filters.filter[filterId] ? iconSizes[filters.filter[filterId].size] : iconSizes.md
      raidIcon = `${path}/${Utility.getPokemonIcon(availableForms, raid_pokemon_id, raid_pokemon_form, raid_pokemon_evolution, raid_pokemon_gender, raid_pokemon_costume)}.png`
    } else if (raid_battle_timestamp < ts) {
      raidIcon = `/images/unknown_egg/${raid_level}.png`
    }
    const offsetY = iconModifiers.offsetY ? -gymSize * iconModifiers.offsetY
      : gymSize * 0.269 - raidSize - filledSlots
    iconHtml += `
      <div class="marker-image-holder top-overlay" 
        style="width:${raidSize}px;
          height:${raidSize}px;
          left:${iconModifiers.offsetX ? iconModifiers.offsetX * 100 : 50}%;
          transform:translateX(-50%);
          top:${offsetY}px;"
      >
        <img 
          src="${raidIcon}" 
          style="width:${raidSize}px; 
          height:${raidSize}px;"
        />`
    if (userSettings.raidLevelBadges) {
      iconHtml += `
      <div 
        class="iv-badge" 
        style="background-color: ${getBadgeColor(raid_level)}; 
          top: 20px; 
          right: -5px;"
      >
      ${raid_level === 6
    ? `<img src="/images/misc/mega.png" 
          style="width:17.5px;
            height: auto;
            position: absolute;
            left: 1.75px;
            bottom: 1.60px;"
        />
      </div>`
    : raid_level}`
    }
    iconHtml += '</div>'
    popupAnchorY += offsetY
  }

  if (userSettings.showExBadge && ex_raid_eligible) {
    iconHtml += `
      <img src="/images/misc/ex.png" 
        style="width:${gymSize / 1.5}px;
        height: auto;
        position: absolute;
        left: -8px;
        bottom: -7px;"
      />`
  }

  return L.divIcon({
    iconSize: [gymSize, gymSize],
    iconAnchor: [gymSize / 2, iconAnchorY],
    popupAnchor: [0, popupAnchorY],
    className: 'gym-marker',
    html: iconHtml,
  })
}

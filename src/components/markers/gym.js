import { divIcon } from 'leaflet'
import getOpacity from '@services/functions/getOpacity'

const getBadgeColor = (raidLevel) => {
  switch (raidLevel) {
    case 1:
    case 2:
      return '#BF05C6'
    case 3:
    case 4:
      return '#9E8A09'
    case 5:
      return '#088DB6'
    case 6:
      return '#21BD21'
    default:
      return '#292929'
  }
}

export default function GymMarker(
  gym,
  hasHatched,
  hasRaid,
  filters,
  Icons,
  userSettings,
  badge,
) {
  const {
    in_battle,
    team_id,
    available_slots,
    raid_level,
    ex_raid_eligible,
    ar_scan_eligible,
  } = gym
  const [gymMod, raidMod] = Icons.getModifiers('gym', 'raid')

  const filledSlots = available_slots !== null ? 6 - available_slots : 0
  let filterId =
    team_id === 0 ? `t${team_id}-0` : `g${team_id}-${filledSlots || 0}`
  const gymIcon = Icons.getGyms(
    team_id,
    filledSlots,
    in_battle,
    userSettings.showExBadge && ex_raid_eligible,
    userSettings.showArBadge && ar_scan_eligible,
  )
  const gymSize = Icons.getSize('gym', filters.filter[filterId])
  let raidIcon
  let raidSize = 0
  const slotModifier = gymMod[filledSlots] || gymMod['0'] || gymSize * 0.5
  const showDiamond =
    filters.gymBadges && userSettings.gymBadgeDiamonds && badge

  if (hasRaid) {
    const {
      raid_pokemon_id,
      raid_pokemon_evolution,
      raid_pokemon_costume,
      raid_pokemon_gender,
      raid_pokemon_form,
      raid_pokemon_alignment,
      raid_is_exclusive,
    } = gym

    if (raid_pokemon_id) {
      filterId = `${raid_pokemon_id}-${raid_pokemon_form}`
      raidIcon = Icons.getPokemon(
        raid_pokemon_id,
        raid_pokemon_form,
        raid_pokemon_evolution,
        raid_pokemon_gender,
        raid_pokemon_costume,
        raid_pokemon_alignment,
      )
      raidSize = Icons.getSize('raid', filters.filter[filterId])
    } else {
      filterId = `e${raid_level}`
      raidIcon = Icons.getEggs(raid_level, hasHatched, raid_is_exclusive)
      raidSize = Icons.getSize('raid', filters.filter[filterId])
    }
  }

  const opacity = userSettings.raidOpacity
    ? getOpacity(gym.raid_end_timestamp, userSettings)
    : 1

  const hasEx = Boolean(
    userSettings.showExBadge && ex_raid_eligible && !gymIcon.includes('_ex'),
  )

  const hasAr = Boolean(
    userSettings.showArBadge && ar_scan_eligible && !gymIcon.includes('_ar'),
  )

  const hasBattle = Boolean(in_battle && !gymIcon.includes('_b'))

  return divIcon({
    popupAnchor: [
      0 + gymMod.popupX + gymMod.offsetX,
      (-gymSize - (showDiamond ? 20 : slotModifier) - raidSize) * 0.67 +
        gymMod.popupY +
        gymMod.offsetY +
        (raidIcon ? raidMod.offsetY + raidMod.popupY : 0),
    ],
    className: 'gym-marker',
    html: /* html */ `
      <div class="marker-image-holder top-overlay">
          ${
            showDiamond
              ? /* html */
                `<div
                  style="
                    width: 46px;
                    height: 46px;
                    background-image: url(${
                      gym.url ? gym.url.replace('http://', 'https://') : ''
                    });
                    background-size: cover;
                    background-repeat: no-repeat;
                    clip-path: polygon(50% 0%, 80% 50%, 50% 100%, 20% 50%);
                    transform: translateX(-38%) translateY(-82%);
                  "
                ></div>
                <img
                  src="${Icons.getMisc(`badge_${badge}`)}"\
                  alt="${badge}"
                  style="
                    width: 48px;
                    height: 48px;
                    bottom: ${2 + gymMod.offsetY}px;
                    left: ${gymMod.offsetX * 50}%;
                    transform: translateX(-50%);
                  "
                />`
              : /* html */
                `<img
                  src="${gymIcon}"
                  alt="${gymIcon}"
                  style="
                    width: ${gymSize}px;
                    height: ${gymSize}px;
                    bottom: ${2 + gymMod.offsetY}px;
                    left: ${gymMod.offsetX * 50}%;
                    transform: translateX(-50%);
                  "
                />
          ${
            hasEx
              ? /* html */
                `<img
                  src="${Icons.getMisc('ex')}"
                  alt="ex"
                  style="
                    width: ${gymSize / 1.5}px;
                    height: auto;
                    bottom: ${2 + gymMod.offsetY}px;
                    left: ${gymMod.offsetX * -33}%;
                    transform: translateX(-50%);
                  "
                />`
              : ''
          }
          ${
            hasAr
              ? /* html */
                `<img
                  src="${Icons.getMisc('ar')}"
                  alt="ar"
                  style="
                    width: ${gymSize / 2}px;
                    height: auto;
                    bottom: ${23 + gymMod.offsetY}px;
                    left: ${gymMod.offsetX * -40}%;
                    transform: translateX(-50%);
                  "
                />`
              : ''
          }
          ${
            hasBattle
              ? /* html */
                `<img
                  src="${Icons.getMisc('battle')}"
                  alt="battle"
                  style="
                    width: ${gymSize}px;
                    height: 'auto',
                    bottom: ${13 + gymMod.offsetY}px;
                    left: ${gymMod.offsetX * 50}%;
                    transform: translateX(-50%);
                  "
                />`
              : ''
          }
          `
          }
          ${
            raidIcon
              ? /* html */
                `<img
                  src="${raidIcon}"
                  alt="${raidIcon}"
                  style="
                    opacity: ${opacity};
                    width: ${raidSize}px;
                    height: ${raidSize}px;
                    bottom: ${gymSize * 0.4 + slotModifier * raidMod.offsetY}px;
                    left: ${raidMod.offsetX * 55}%;
                    transform: translateX(-50%);
                  "
                />`
              : ''
          }
          ${
            raidIcon && userSettings.raidLevelBadges /* html */
              ? `
                <div
                  class="iv-badge flex-center raid-badge"
                  style="
                    opacity: ${opacity};
                    background-color: ${getBadgeColor(raid_level)};
                    bottom: ${gymSize * 0.4 * raidMod.offsetY}px;
                    left: ${raidMod.offsetX * 200}%;
                    transform: translateX(-50%);
                    min-width: ${raid_level === 6 ? 10 : 12}px;
                  "
                >
              ${
                raid_level === 6
                  ? /* html */
                    `<img
                      src="${Icons.getMisc('mega')}"
                      alt="mega"
                      style="
                        opacity: ${opacity};
                        width: 10px;
                        height: auto;
                      "
                    />`
                  : raid_level
              }
          </div>`
              : ''
          }
      </div>
    `,
  })
}

// @ts-check
import { divIcon } from 'leaflet'
import { useMemory } from '@store/useMemory'

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

/**
 *
 * @param {{
 *  gymIconUrl: string,
 *  gymIconSize: number,
 *  raidIconUrl: string,
 *  raidIconSize: number,
 *  showDiamond: boolean,
 *  showExBadge: boolean,
 *  showArBadge: boolean,
 *  showRaidLevel: boolean,
 *  opacity: number,
 * } & import('@rm/types').Gym} params
 * @returns
 */
export function gymMarker({
  gymIconUrl,
  gymIconSize,
  raidIconUrl,
  raidIconSize,
  showDiamond,
  showExBadge,
  showArBadge,
  showRaidLevel,
  opacity,
  available_slots,
  in_battle,
  raid_level,
  badge,
  ...gym
}) {
  const { Icons } = useMemory.getState()
  const [gymMod, raidMod] = Icons.getModifiers('gym', 'raid')

  const filledSlots = available_slots !== null ? 6 - available_slots : 0
  const slotModifier = gymMod[filledSlots] || gymMod['0'] || gymIconSize * 0.5

  const hasBattle = Boolean(in_battle && !gymIconUrl.includes('_b'))

  return divIcon({
    popupAnchor: [
      0 + gymMod.popupX + gymMod.offsetX,
      (-gymIconSize - (showDiamond ? 20 : slotModifier) - raidIconSize) * 0.67 +
        gymMod.popupY +
        gymMod.offsetY +
        (raidIconUrl ? raidMod.offsetY + raidMod.popupY : 0),
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
                ${
                  badge == 4
                    ? ''
                    : `<img
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
                }`
              : /* html */
                `<img
                  src="${gymIconUrl}"
                  alt="${gymIconUrl}"
                  style="
                    width: ${gymIconSize}px;
                    height: ${gymIconSize}px;
                    bottom: ${2 + gymMod.offsetY}px;
                    left: ${gymMod.offsetX * 50}%;
                    transform: translateX(-50%);
                  "
                />
          ${
            showExBadge
              ? /* html */
                `<img
                  src="${Icons.getMisc('ex')}"
                  alt="ex"
                  style="
                    width: ${gymIconSize / 1.5}px;
                    height: auto;
                    bottom: ${2 + gymMod.offsetY}px;
                    left: ${gymMod.offsetX * -33}%;
                    transform: translateX(-50%);
                  "
                />`
              : ''
          }
          ${
            showArBadge
              ? /* html */
                `<img
                  src="${Icons.getMisc('ar')}"
                  alt="ar"
                  style="
                    width: ${gymIconSize / 2}px;
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
                    width: ${gymIconSize}px;
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
            raidIconUrl
              ? /* html */
                `<img
                  src="${raidIconUrl}"
                  alt="${raidIconUrl}"
                  style="
                    opacity: ${opacity};
                    width: ${raidIconSize}px;
                    height: ${raidIconSize}px;
                    bottom: ${
                      gymIconSize * 0.4 + slotModifier * raidMod.offsetY
                    }px;
                    left: ${raidMod.offsetX * 55}%;
                    transform: translateX(-50%);
                  "
                />`
              : ''
          }
          ${
            showRaidLevel /* html */
              ? `
                <div
                  class="iv-badge flex-center raid-badge"
                  style="
                    opacity: ${opacity};
                    background-color: ${getBadgeColor(raid_level)};
                    bottom: ${gymIconSize * 0.4 * raidMod.offsetY}px;
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

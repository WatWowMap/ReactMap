/* eslint-disable no-nested-ternary */
import { divIcon } from 'leaflet'
import getOpacity from '@services/functions/getOpacity'

export default function stopMarker(
  pokestop,
  hasQuest,
  hasLure,
  hasInvasion,
  filters,
  Icons,
  userSettings,
  hasEvent,
) {
  const { lure_id, ar_scan_eligible, power_up_level, events } = pokestop
  const [invasionMod, pokestopMod, rewardMod] = Icons.getModifiers(
    'invasion',
    'pokestop',
    'reward',
  )

  let filterId = 's0'
  let popupYOffset = 1.3
  const baseIcon = Icons.getPokestops(
    hasLure ? lure_id : 0,
    hasInvasion,
    hasQuest && userSettings.hasQuestIndicator,
    ar_scan_eligible && (userSettings.showArBadge || power_up_level),
    power_up_level,
    hasEvent ? events[0].display_type : '',
  )
  let baseSize = Icons.getSize('pokestop', filters.filter[filterId])
  let popupX = 7 + pokestopMod.popupX
  let { popupY } = pokestopMod

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
    invasions.forEach((invasion) => {
      if (invasion.grunt_type) {
        filterId = `i${invasion.grunt_type}`
        invasionIcons.unshift({
          icon: Icons.getInvasions(invasion.grunt_type, invasion.confirmed),
          opacity: userSettings.invasionOpacity
            ? getOpacity(invasion.incident_expire_timestamp, userSettings)
            : 1,
        })
        invasionSizes.unshift(
          Icons.getSize('invasion', filters.filter[filterId]),
        )
        popupYOffset += rewardMod.offsetY - 1
        popupX += invasionMod.popupX
        popupY += invasionMod.popupY
      }
    })
  }
  if (hasQuest && !(hasInvasion && invasionMod?.removeQuest)) {
    const { quests } = pokestop

    quests.forEach((quest) => {
      const {
        quest_item_id,
        item_amount,
        xp_amount,
        stardust_amount,
        candy_pokemon_id,
        candy_amount,
        xl_candy_pokemon_id,
        xl_candy_amount,
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
        case 1:
          questIcons.unshift({
            url: Icons.getRewards(quest_reward_type, xp_amount),
            amount: xp_amount,
          })
          break
        case 2:
          questIcons.unshift({
            url: Icons.getRewards(
              quest_reward_type,
              quest_item_id,
              item_amount,
            ),
            amount: item_amount > 1 && item_amount,
          })
          break
        case 3:
          questIcons.unshift({
            url: Icons.getRewards(quest_reward_type, stardust_amount),
            amount: stardust_amount,
          })
          break
        case 4:
          questIcons.unshift({
            url: Icons.getRewards(
              quest_reward_type,
              candy_pokemon_id,
              candy_amount,
            ),
            amount: candy_amount,
          })
          break
        case 7:
          questIcons.unshift({
            url: Icons.getPokemon(
              quest_pokemon_id,
              quest_form_id,
              0,
              quest_gender_id,
              quest_costume_id,
              0,
              quest_shiny,
            ),
          })
          break
        case 9:
          questIcons.unshift({
            url: Icons.getRewards(
              quest_reward_type,
              xl_candy_pokemon_id,
              xl_candy_amount,
            ),
            amount: xl_candy_amount,
          })
          break
        case 12:
          questIcons.unshift({
            url: Icons.getRewards(
              quest_reward_type,
              mega_pokemon_id,
              mega_amount,
            ),
            amount: mega_amount,
          })
          break
        default:
          questIcons.unshift({ url: Icons.getRewards(quest_reward_type) })
      }
      questSizes.unshift(Icons.getSize('reward', filters.filter[key]))
      popupYOffset += rewardMod.offsetY - 1
      popupX += rewardMod.popupX
      popupY += rewardMod.popupY
    })
  }

  const totalQuestSize = questSizes.reduce((a, b) => a + b, 0)
  const totalInvasionSize = invasionSizes.reduce((a, b) => a + b, 0)

  const showAr =
    userSettings.showArBadge && ar_scan_eligible && !baseIcon.includes('_ar')

  return divIcon({
    popupAnchor: [
      popupX - 5,
      (pokestopMod.manualPopup
        ? pokestopMod.manualPopup -
          totalInvasionSize * 0.25 -
          totalQuestSize * 0.1
        : -(baseSize + totalInvasionSize + totalQuestSize) / popupYOffset) +
        popupY,
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
        ${questIcons
          .map(
            (icon, i) => `
              <img
                src="${icon.url}"
                alt="${icon.url}"
                style="
                  width: ${questSizes[i]}px;
                  height: ${questSizes[i]}px;
                  bottom: ${
                    (baseSize * 0.6 +
                      (invasionMod?.removeQuest ? 10 : totalInvasionSize)) *
                      rewardMod.offsetY +
                    questSizes[i] * i
                  }px;
                  left: ${rewardMod.offsetX * 50}%;
                  transform: translateX(-50%);
                "
              />
              ${
                (
                  icon.url.includes('stardust') ||
                  icon.url.includes('experience')
                    ? icon.url.includes('/0.')
                    : !icon.url.includes('_a') && icon.amount
                )
                  ? /* html */ `
                  <div
                    class="amount-holder"
                    style="
                      bottom: ${
                        (baseSize * 0.6 +
                          (invasionMod?.removeQuest ? 10 : totalInvasionSize)) *
                          rewardMod.offsetY +
                        questSizes[i] * i
                      }px;
                      left: ${rewardMod.offsetX * 50}%;
                      transform: translateX(-50%);
                    "
                  >
                    x${icon.amount}
                  </div>
                `
                  : ''
              }
          `,
          )
          .join('')}
        ${invasionIcons
          .map(
            (invasion, i) => /* html */ `
              <img
                key="${invasion.icon}"
                src="${invasion.icon}"
                alt="${invasion.icon}"
                style="
                  opacity: ${invasion.opacity};
                  width: ${invasionSizes[i]}px;
                  height: ${invasionSizes[i]}px;
                  bottom: ${
                    baseSize * 0.5 * invasionMod.offsetY + invasionSizes[i] * i
                  }px;
                  left: ${invasionMod.offsetX * 50}%;
                  transform: translateX(-50%);
                "
              />
          `,
          )
          .join('')}
      </div>`,
  })
}

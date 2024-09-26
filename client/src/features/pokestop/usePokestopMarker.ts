// @ts-check
import { divIcon } from 'leaflet'

import { basicEqualFn, useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useOpacity } from '@hooks/useOpacity'

/**
 *
 * @param {{
 *  hasQuest: boolean,
 *  hasLure: boolean,
 *  hasInvasion: boolean,
 *  hasEvent: boolean,
 * } & import('@rm/types').Pokestop} param0
 * @returns
 */
export function usePokestopMarker({
  hasQuest,
  hasLure,
  hasInvasion,
  hasEvent,
  lure_id,
  ar_scan_eligible,
  power_up_level,
  events,
  invasions,
  quests,
}) {
  const [, Icons] = useStorage(
    (s) => [s.icons, useMemory.getState().Icons],
    (a, b) => Object.entries(a[0]).every(([k, v]) => b[0][k] === v),
  )

  const getOpacity = useOpacity('pokestops', 'invasion')
  const [showArBadge, baseIcon, baseSize] = useStorage((s) => {
    const { filters, userSettings } = s
    return [
      userSettings.pokestops.showArBadge,
      Icons.getPokestops(
        hasLure ? lure_id : 0,
        hasInvasion,
        hasQuest && userSettings.pokestops.hasQuestIndicator,
        ar_scan_eligible &&
          (userSettings.pokestops.showArBadge || !!power_up_level),
        power_up_level,
        hasEvent ? Math.max(...events.map((event) => event.display_type)) : 0,
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
  const showcaseIcons = []
  const showcaseSizes = []

  if (hasInvasion) {
    invasions.forEach((invasion) => {
      if (invasion.grunt_type) {
        invasionIcons.unshift({
          icon: Icons.getInvasions(invasion.grunt_type, invasion.confirmed),
          opacity: getOpacity(invasion.incident_expire_timestamp),
        })
        invasionSizes.unshift(
          Icons.getSize('invasion', filters[`i${invasion.grunt_type}`]?.size),
        )
        popupYOffset += invasionMod.offsetY - 1
        popupX += invasionMod.popupX
        popupY += invasionMod.popupY
      }
    })
  }

  if (hasQuest && !(hasInvasion && invasionMod?.removeQuest)) {
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
              !!quest_shiny,
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
      questSizes.unshift(Icons.getSize('reward', filters[key]?.size))
      popupYOffset += rewardMod.offsetY - 1
      popupX += rewardMod.popupX
      popupY += rewardMod.popupY
    })
  }
  if (hasEvent && !hasInvasion && !hasQuest) {
    events.forEach((event) => {
      if (event.display_type === 8) {
        showcaseIcons.unshift({
          url: Icons.getPokemon(352),
        })
        showcaseSizes.unshift(Icons.getSize('event', filters.b7?.size))
      } else if (event.display_type === 9) {
        if (event.showcase_pokemon_id) {
          showcaseIcons.unshift({
            url: Icons.getPokemon(
              event.showcase_pokemon_id,
              event.showcase_pokemon_form_id,
            ),
            decoration: true,
          })
          showcaseSizes.unshift(
            Icons.getSize(
              'event',
              filters[
                `f${event.showcase_pokemon_id}-${event.showcase_pokemon_form_id}`
              ]?.size,
            ),
          )
        } else if (event.showcase_pokemon_type_id) {
          showcaseIcons.unshift({
            url: Icons.getTypes(event.showcase_pokemon_type_id),
            decoration: true,
          })
          showcaseSizes.unshift(
            Icons.getSize(
              'event',
              filters[`h${event.showcase_pokemon_type_id}`]?.size,
            ),
          )
        }
      }
      popupYOffset += eventMod.offsetY - 1
      popupX += eventMod.popupX
      popupY += eventMod.popupY
    })
  }
  const totalQuestSize = questSizes.reduce((a, b) => a + b, 0)
  const totalInvasionSize = invasionSizes.reduce((a, b) => a + b, 0)
  const totalShowcaseSize = showcaseSizes.reduce((a, b) => a + b, -3)

  const showAr = showArBadge && ar_scan_eligible && !baseIcon.includes('_ar')

  return divIcon({
    popupAnchor: [
      popupX - 5,
      (pokestopMod.manualPopup
        ? pokestopMod.manualPopup -
          totalInvasionSize * 0.25 -
          totalQuestSize * 0.1
        : -(baseSize + totalInvasionSize + totalQuestSize + totalShowcaseSize) /
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
          ${showcaseIcons
            .map(
              (icon, i) => `
                <img
                  src="${icon.url}"
                  alt="${icon.url}"
                  style="
                    width: ${showcaseSizes[i]}px;
                    height: ${showcaseSizes[i]}px;
                    bottom: ${
                      baseSize * 0.6 * eventMod.offsetY + showcaseSizes[i] * i
                    }px;
                    left: ${eventMod.offsetX * 50}%;
                    transform: translateX(-50%);
                  "
                />
                ${
                  icon.decoration
                    ? `
                  <img
                    src="${Icons.getMisc('showcase')}"
                    style="
                      width: ${showcaseSizes[i] * 0.66}px;
                      height: ${showcaseSizes[i] * 0.66}px;
                      bottom: ${
                        baseSize * 0.3 * eventMod.offsetY + showcaseSizes[i] * i
                      }px;
                      left: ${eventMod.offsetX * 50}%;
                      transform: translateX(-50%);
                    "
                  />
                `
                    : ''
                }
            `,
            )
            .join('')}
        </div>`,
  })
}

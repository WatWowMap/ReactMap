export default function genPokestops(t, pokemon, pokestops, categories) {
  const tempObj = Object.fromEntries(categories.map(x => [x, {}]))
  if (!pokestops?.filter) return {}

  Object.keys(pokestops.filter).forEach(id => {
    if (id !== 'global' && !/\d/.test(id.charAt(0))) {
      switch (id.charAt(0)) {
        case 'i':
          if (tempObj.invasions) {
            tempObj.invasions[id] = {
              name: t(`grunt_a_${id.slice(1)}`, `grunt_${id.slice(1)}`),
              perms: ['invasions'],
            }
            tempObj.invasions[id].searchMeta = `${t('invasions').toLowerCase()} ${t(`grunt_${id.slice(1)}`).toLowerCase()}`
          } break
        case 'd':
          if (tempObj.quest_reward_3) {
            tempObj.quest_reward_3[id] = {
              name: `x${id.slice(1)}`,
              perms: ['quests'],
            }
            tempObj.quest_reward_3[id].searchMeta = `${t('quest_reward_3').toLowerCase()} ${tempObj.quest_reward_3[id].name.toLowerCase()}`
          } break
        case 'm':
          if (tempObj.quest_reward_12) {
            tempObj.quest_reward_12[id] = {
              name: `${t(`poke_${id.slice(1).split('-')[0]}`)} x${id.split('-')[1]}`,
              perms: ['quests'],
              genId: `generation_${pokemon[id.slice(1).split('-')[0]].genId}`,
              formTypes: pokemon[id.slice(1).split('-')[0]].types.map(x => `poke_type_${x}`),
              rarity: pokemon[id.slice(1).split('-')[0]].rarity,
              family: pokemon[id.slice(1).split('-')[0]].family,
            }
            tempObj.quest_reward_12[id].searchMeta = `${Object.values(tempObj.quest_reward_12[id])
              .flatMap(x => t(x))
              .join(' ')
              .toLowerCase()} ${t('quest_reward_12').toLowerCase()}`
          } break
        case 'q':
          if (tempObj.items) {
            tempObj.items[id] = {
              name: t(`item_${id.slice(1)}`),
              perms: ['quests'],
            }
            tempObj.items[id].searchMeta = `${t('items').toLowerCase()} ${tempObj.items[id].name.toLowerCase()}`
          } break
        case 'l':
          if (tempObj.lures) {
            tempObj.lures[id] = {
              name: t(`lure_${id.slice(1)}`),
              perms: ['lures'],
            }
            tempObj.lures[id].searchMeta = `${t('lures').toLowerCase()} ${tempObj.lures[id].name.toLowerCase()}`
          } break
        case 'x':
        case 'c':
          if (tempObj.quest_reward_4 && tempObj.quest_reward_9) {
            const category = [id.charAt(0) === 'c' ? 'quest_reward_4' : 'quest_reward_9']
            tempObj[category][id] = {
              name: `${t(`poke_${id.slice(1)}`)} ${id.charAt(0) === 'c' ? t('candy') : t('xl')}`,
              perms: ['quests'],
              genId: `generation_${pokemon[id.slice(1).split('-')[0]].genId}`,
              formTypes: pokemon[id.slice(1).split('-')[0]].types.map(x => `poke_type_${x}`),
              rarity: pokemon[id.slice(1).split('-')[0]].rarity,
              family: pokemon[id.slice(1).split('-')[0]].family,
            }
            tempObj[category][id].searchMeta = `${Object.values(tempObj[category][id])
              .flatMap(x => t(x))
              .join(' ')
              .toLowerCase()} ${t(category).toLowerCase()}`
          } break
        case 'u':
          if (tempObj.general) {
            tempObj.general[id] = {
              name: t(`quest_reward_${id.slice(1)}`),
              perms: ['quests'],
            }
            tempObj.general[id].searchMeta = `${t('general').toLowerCase()} ${tempObj.general[id].name.toLowerCase()}`
          } break
        default:
          if (tempObj.pokestops) {
            tempObj.pokestops[id] = {
              name: t('pokestop'),
              perms: ['pokestops'],
            }
          }
      }
    }
  })
  return tempObj
}

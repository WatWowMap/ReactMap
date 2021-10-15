import { useTranslation } from 'react-i18next'

export default function genPokestops(Icons, pokestops, masterfile, menus) {
  const { t } = useTranslation()
  const tempObj = Object.fromEntries(menus.categories.map(x => [x, {}]))

  Object.keys(pokestops.filter).forEach(id => {
    if (id !== 'global' && !/\d/.test(id.charAt(0))) {
      switch (id.charAt(0)) {
        case 'i':
          if (tempObj.invasions) {
            tempObj.invasions[id] = {
              name: t(`grunt_a_${id.slice(1)}`, `grunt_${id.slice(1)}`),
              url: Icons.getInvasions(id.slice(1)),
              perm: 'invasions',
            }
          } break
        case 'd':
          if (tempObj.quest_reward_3) {
            tempObj.quest_reward_3[id] = {
              name: `x${id.slice(1)}`,
              url: Icons.getRewards(3, id.slice(1)),
              perm: 'quests',
            }
          } break
        case 'm':
          if (tempObj.quest_reward_12) {
            tempObj.quest_reward_12[id] = {
              name: `${t(`poke_${id.slice(1).split('-')[0]}`)} x${id.split('-')[1]}`,
              url: Icons.getPokemon(...id.slice(1).split('-'), 1),
              perm: 'quests',
              genId: `generation_${masterfile.pokemon[id.slice(1).split('-')[0]].genId}`,
              formTypes: masterfile.pokemon[id.slice(1).split('-')[0]].types.map(x => `poke_type_${x}`),
              rarity: masterfile.pokemon[id.slice(1).split('-')[0]].rarity,
              family: masterfile.pokemon[id.slice(1).split('-')[0]].family,
            }
          } break
        case 'q':
          if (tempObj.items) {
            tempObj.items[id] = {
              name: t(`item_${id.slice(1)}`),
              url: Icons.getRewards(2, ...id.slice(1).split('-')),
              perm: 'quests',
            }
          } break
        case 'l':
          if (tempObj.lures) {
            tempObj.lures[id] = {
              name: t(`lure_${id.slice(1)}`),
              url: Icons.getPokestops(id.slice(1)),
              perm: 'lures',
            }
          } break
        case 'x':
        case 'c':
          if (tempObj.quest_reward_4 && tempObj.quest_reward_9) {
            tempObj[id.charAt(0) === 'c' ? 'quest_reward_4' : 'quest_reward_9'][id] = {
              name: `${t(`poke_${id.slice(1)}`)} ${id.charAt(0) === 'c' ? t('candy') : t('xl')}`,
              url: Icons.getRewards(id.charAt(0) === 'c' ? 4 : 9, ...id.slice(1).split('-')),
              perm: 'quests',
              genId: `generation_${masterfile.pokemon[id.slice(1).split('-')[0]].genId}`,
              formTypes: masterfile.pokemon[id.slice(1).split('-')[0]].types.map(x => `poke_type_${x}`),
              rarity: masterfile.pokemon[id.slice(1).split('-')[0]].rarity,
              family: masterfile.pokemon[id.slice(1).split('-')[0]].family,
            }
          } break
        case 'u':
          if (tempObj.general) {
            tempObj.general[id] = {
              name: t(`quest_reward_${id.slice(1)}`),
              url: Icons.getRewards(id.slice(1)),
              perm: 'quests',
            }
          } break
        default:
          if (tempObj.pokestops) {
            tempObj.pokestops[id] = {
              name: t('pokestop'),
              url: Icons.getPokestops(0),
              perm: 'pokestops',
            }
          }
      }
    }
  })
  return tempObj
}

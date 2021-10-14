import { useTranslation } from 'react-i18next'

export default function genPokestops(Icons, pokestops, masterfile) {
  const { t } = useTranslation()

  const tempObj = {
    invasions: {},
    stardust: {},
    candy: {},
    xlCandy: {},
    quests: {},
    energy: {},
    items: {},
    pokestops: {},
    lures: {},
  }

  Object.keys(pokestops.filter).forEach(id => {
    if (id !== 'global' && !/\d/.test(id.charAt(0))) {
      switch (id.charAt(0)) {
        case 'i':
          tempObj.invasions[id] = {
            name: t(`grunt_a_${id.slice(1)}`, `grunt_${id.slice(1)}`),
            url: Icons.getInvasions(id.slice(1)),
            perm: 'invasions',
          }; break
        case 'd':
          tempObj.stardust[id] = {
            name: `x${id.slice(1)}`,
            url: Icons.getRewards(3, id.slice(1)),
            perm: 'quests',
          }; break
        case 'm':
          tempObj.energy[id] = {
            name: `${t(`poke_${id.slice(1).split('-')[0]}`)} x${id.split('-')[1]}`,
            url: Icons.getPokemon(...id.slice(1).split('-'), 1),
            perm: 'quests',
            genId: `generation_${masterfile.pokemon[id.slice(1).split('-')[0]].genId}`,
            formTypes: masterfile.pokemon[id.slice(1).split('-')[0]].types.map(x => `poke_type_${x}`),
            rarity: masterfile.pokemon[id.slice(1).split('-')[0]].rarity,
          }; break
        case 'q':
          tempObj.items[id] = {
            name: t(`item_${id.slice(1)}`),
            url: Icons.getRewards(2, ...id.slice(1).split('-')),
            perm: 'quests',
          }; break
        case 'l':
          tempObj.lures[id] = {
            name: t(`lure_${id.slice(1)}`),
            url: Icons.getPokestops(id.slice(1)),
            perm: 'lures',
          }; break
        case 'c':
          tempObj.candy[id] = {
            name: `${t(`poke_${id.slice(1)}`)} ${t('candy')}`,
            url: Icons.getRewards(4, ...id.slice(1).split('-')),
            perm: 'quests',
            genId: `generation_${masterfile.pokemon[id.slice(1).split('-')[0]].genId}`,
            formTypes: masterfile.pokemon[id.slice(1).split('-')[0]].types.map(x => `poke_type_${x}`),
            rarity: masterfile.pokemon[id.slice(1).split('-')[0]].rarity,
            family: masterfile.pokemon[id.slice(1).split('-')[0]].family,
          }; break
        case 'u':
          tempObj.quests[id] = {
            name: `${t(`poke_${id.slice(1)}`)} ${t('candy')}`,
            url: Icons.getRewards(id.slice(1)),
            perm: 'quests',
          }; break
        default:
          tempObj.pokestops[id] = {
            name: t('pokestop'),
            url: Icons.getPokestops(0),
            perm: 'pokestops',
          }
      }
    }
  })
  return tempObj
}

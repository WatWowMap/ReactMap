// @ts-check
import { useMemory } from '@store/useMemory'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export function useGenPokestops() {
  const { t } = useTranslation()
  const pokemon = useMemory((s) => s.masterfile.pokemon)
  const pokestops = useMemory((s) => s.filters.pokestops)
  const categories = useMemory((s) => s.menus.pokestops.categories)

  useEffect(() => {
    /** @type {import('@rm/types').ClientFilterObj} */
    const tempObj = Object.fromEntries(categories.map((x) => [x, {}]))
    if (!pokestops?.filter) return

    if (tempObj.invasions) {
      tempObj.invasions.i0 = {
        name: t('poke_global'),
        perms: ['invasions'],
        webhookOnly: true,
      }
      tempObj.invasions['gold-stop'] = {
        name: t('gold_stop'),
        perms: ['invasions'],
        webhookOnly: true,
      }
      tempObj.invasions.kecleon = {
        name: t('poke_352'),
        perms: ['invasions'],
        webhookOnly: true,
      }
      tempObj.invasions.showcase = {
        name: t('showcase'),
        perms: ['invasions'],
        webhookOnly: true,
      }
    }

    Object.keys(pokestops.filter).forEach((id) => {
      if (id !== 'global') {
        switch (id.charAt(0)) {
          case 'a':
            if (tempObj.rocket_pokemon) {
              const name = t(`poke_${id.slice(1).split('-')[0]}`)
              tempObj.rocket_pokemon[id] = {
                name,
                perms: ['invasions'],
              }
              tempObj.rocket_pokemon[id].searchMeta = name.toLowerCase()
            }
            break
          case 'i':
            if (tempObj.invasions) {
              tempObj.invasions[id] = {
                name: t(`grunt_a_${id.slice(1)}`, `grunt_${id.slice(1)}`),
                perms: ['invasions'],
              }
              tempObj.invasions[id].searchMeta = `${t(
                'invasions',
              ).toLowerCase()} ${t(`grunt_${id.slice(1)}`).toLowerCase()}`
            }
            break
          case 'h':
            if (tempObj.showcase) {
              const name = t(`poke_type_${id.slice(1)}`)
              tempObj.showcase[id] = {
                name,
                perms: ['eventStops'],
              }
              tempObj.showcase[id].searchMeta = `${t(
                'showcase',
              ).toLowerCase()} ${name.toLowerCase()}`
            }
            break
          case 'f':
            if (tempObj.showcase) {
              const name = t(`poke_${id.slice(1).split('-')[0]}`)
              tempObj.showcase[id] = {
                name,
                perms: ['eventStops'],
              }
              tempObj.showcase[id].searchMeta = `${t(
                'showcase',
              ).toLowerCase()} ${name.toLowerCase()}`
            }
            break
          case 'd':
            if (tempObj.quest_reward_3) {
              tempObj.quest_reward_3[id] = {
                name: `x${id.slice(1)}`,
                perms: ['quests'],
              }
              tempObj.quest_reward_3[id].searchMeta = `${t(
                'quest_reward_3',
              ).toLowerCase()} ${tempObj.quest_reward_3[id].name.toLowerCase()}`
            }
            break
          case 'm':
            {
              const monId = id && id.slice(1).split('-')[0]
              if (tempObj.quest_reward_12 && pokemon[monId]) {
                tempObj.quest_reward_12[id] = {
                  name: `${t(`poke_${monId}`)} x${id.split('-')[1]}`,
                  perms: ['quests'],
                  genId: `generation_${pokemon[monId].genId}`,
                  formTypes: pokemon[monId].types.map((x) => `poke_type_${x}`),
                  rarity: pokemon[monId].rarity,
                  family: pokemon[monId].family,
                }
                tempObj.quest_reward_12[id].searchMeta = `${Object.values(
                  tempObj.quest_reward_12[id],
                )
                  .flatMap((x) => t(x))
                  .join(' ')
                  .toLowerCase()} ${t('quest_reward_12').toLowerCase()}`
              }
            }
            break
          case 'p':
            if (tempObj.quest_reward_1) {
              tempObj.quest_reward_1[id] = {
                name: `x${id.slice(1)}`,
                perms: ['quests'],
              }
              tempObj.quest_reward_1[id].searchMeta = `${t(
                'quest_reward_1',
              ).toLowerCase()} ${tempObj.quest_reward_1[id].name.toLowerCase()}`
            }
            break
          case 'q':
            if (tempObj.items) {
              tempObj.items[id] = {
                name: t(`item_${id.slice(1)}`),
                perms: ['quests'],
              }
              tempObj.items[id].searchMeta = `${t(
                'items',
              ).toLowerCase()} ${tempObj.items[id].name.toLowerCase()}`
            }
            break
          case 'l':
            if (tempObj.lures) {
              tempObj.lures[id] = {
                name: t(`lure_${id.slice(1)}`),
                perms: ['lures'],
              }
              tempObj.lures[id].searchMeta = `${t(
                'lures',
              ).toLowerCase()} ${tempObj.lures[id].name.toLowerCase()}`
            }
            break
          case 'x':
          case 'c':
            {
              const monId = id && id.slice(1)
              if (
                tempObj.quest_reward_4 &&
                tempObj.quest_reward_9 &&
                pokemon[monId]
              ) {
                const category =
                  id.charAt(0) === 'c' ? 'quest_reward_4' : 'quest_reward_9'
                tempObj[category][id] = {
                  name: `${t(`poke_${monId}`)} ${
                    id.charAt(0) === 'c' ? t('candy') : t('xl')
                  }`,
                  perms: ['quests'],
                  genId: `generation_${pokemon[monId].genId}`,
                  formTypes: pokemon[monId].types.map((x) => `poke_type_${x}`),
                  rarity: pokemon[monId].rarity,
                  family: pokemon[monId].family,
                }
                tempObj[category][id].searchMeta = `${Object.values(
                  tempObj[category][id],
                )
                  .flatMap((x) => t(x))
                  .join(' ')
                  .toLowerCase()} ${t(category).toLowerCase()}`
              }
            }
            break
          case 'u':
            if (tempObj.general) {
              tempObj.general[id] = {
                name: t(`quest_reward_${id.slice(1)}`),
                perms: ['quests'],
              }
              tempObj.general[id].searchMeta = `${t(
                'general',
              ).toLowerCase()} ${tempObj.general[id].name.toLowerCase()}`
            }
            break
          default:
            if (/\d/.test(id.charAt(0))) {
              // Handle numbered IDs - these are pokemon encounters
              // ID format: pokemonId or pokemonId-formId
              const [pokemonId, formId] = id.split('-', 2)
              const pokemonData = pokemon[pokemonId]
              if (tempObj.quest_pokemon && pokemonData) {
                if (formId) {
                  // Handle specific form
                  const form = pokemonData.forms[formId]
                  if (form) {
                    const pokeName = t(`poke_${pokemonId}`)
                    const formName = t(`form_${formId}`)
                    const formTypes = (
                      form.types ||
                      pokemonData.types ||
                      []
                    ).map((x) => `poke_type_${x}`)
                    const name =
                      form.name &&
                      form.name !== 'Normal' &&
                      formId !== '0' &&
                      +formId !== pokemonData.defaultFormId
                        ? formName
                        : pokeName

                    tempObj.quest_pokemon[id] = {
                      name: form.name === '*' ? `${name}*` : name,
                      category: form.name === '*' ? form.category : undefined,
                      pokedexId: +pokemonId,
                      formId: +formId,
                      defaultFormId: pokemonData.defaultFormId,
                      pokeName,
                      formName,
                      formTypes,
                      rarity: form.rarity || pokemonData.rarity,
                      historic: pokemonData.historic,
                      legendary: pokemonData.legendary,
                      mythical: pokemonData.mythical,
                      ultraBeast: pokemonData.ultraBeast,
                      genId: `generation_${pokemonData.genId}`,
                      perms: ['quests'],
                      family: pokemonData.family,
                    }
                    tempObj.quest_pokemon[id].searchMeta = `${Object.entries(
                      tempObj.quest_pokemon[id],
                    )
                      .flatMap(([k, v]) =>
                        Array.isArray(v)
                          ? v.map((y) => t(y))
                          : typeof v === 'boolean'
                            ? v
                              ? t(k)
                              : ''
                            : t(v),
                      )
                      .join(' ')
                      .toLowerCase()} ${t('pokemon').toLowerCase()}`
                  }
                } else {
                  // Handle pokemon without specific form (use pokemonData directly)
                  const pokeName = t(`poke_${pokemonId}`)
                  const formTypes = pokemonData.types.map(
                    (x) => `poke_type_${x}`,
                  )

                  tempObj.quest_pokemon[id] = {
                    name: pokeName,
                    pokedexId: +pokemonId,
                    formId: pokemonData.defaultFormId,
                    defaultFormId: pokemonData.defaultFormId,
                    pokeName,
                    formTypes,
                    rarity: pokemonData.rarity,
                    historic: pokemonData.historic,
                    legendary: pokemonData.legendary,
                    mythical: pokemonData.mythical,
                    ultraBeast: pokemonData.ultraBeast,
                    genId: `generation_${pokemonData.genId}`,
                    perms: ['quests'],
                    family: pokemonData.family,
                  }
                  tempObj.quest_pokemon[id].searchMeta = `${Object.entries(
                    tempObj.quest_pokemon[id],
                  )
                    .flatMap(([k, v]) =>
                      Array.isArray(v)
                        ? v.map((y) => t(y))
                        : typeof v === 'boolean'
                          ? v
                            ? t(k)
                            : ''
                          : t(v),
                    )
                    .join(' ')
                    .toLowerCase()} ${t('pokemon').toLowerCase()}`
                }
              }
            } else if (tempObj.pokestops) {
              tempObj.pokestops[id] = {
                name: t('pokestop'),
                perms: ['pokestops'],
              }
            }
        }
      }
    })
    useMemory.setState((prev) => ({
      menuFilters: { ...prev.menuFilters, ...tempObj },
    }))
  }, [pokemon, pokestops, categories, t])
}

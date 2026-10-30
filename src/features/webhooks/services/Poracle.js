// @ts-check
import { t } from 'i18next'

import { useMemory } from '@store/useMemory'
import { useWebhookStore } from '@store/useWebhookStore'

import { ruleId } from './ruleForm'

export class Poracle {
  static getMapCategory(poracleCategory) {
    switch (poracleCategory) {
      case 'gym':
      case 'egg':
      case 'raid':
        return 'gyms'
      case 'invasion':
      case 'incident':
      case 'lure':
      case 'quest':
        return 'pokestops'
      case 'nest':
        return 'nests'
      default:
        return poracleCategory
    }
  }

  static getFilterCategories(poracleCategory) {
    switch (poracleCategory) {
      case 'egg':
        return ['eggs']
      case 'invasion':
      case 'incident':
        return ['invasions']
      case 'gym':
        return ['teams']
      case 'lure':
        return ['lures']
      case 'nest':
        return ['pokemon']
      case 'raid':
        return ['raids', 'pokemon']
      case 'quest':
        return [
          'items',
          'quest_reward_12',
          'pokemon',
          'quest_reward_4',
          'quest_reward_3',
        ]
      default:
        return [poracleCategory]
    }
  }

  static getId(item) {
    if (!item) return ''
    const { category } = useWebhookStore.getState()
    return ruleId(category, item, useMemory.getState().masterfile.invasions)
  }

  static getIdObj(id) {
    if (!id) return {}
    if (id === 'gold-stop' || id === 'kecleon' || id === 'showcase') {
      return { id, type: 'incident' }
    }
    if (id.startsWith('incident-')) {
      return { id: id.replace('incident-', ''), type: 'incident' }
    }
    switch (id.charAt(0)) {
      case 'e':
        return { id: id.replace('e', ''), type: 'egg' }
      case 'i':
        return { id: id.replace('i', ''), type: 'invasion' }
      case 'l':
        return { id: id.replace('l', ''), type: 'lure' }
      case 'r':
        return { id: id.replace('r', ''), type: 'raid' }
      case 'q':
        return { id: id.replace('q', ''), type: 'item' }
      case 'm':
        return { id: id.split('-')[0].replace('m', ''), type: 'pokemon' }
      case 'c':
        return { id: id.replace('c', ''), type: 'pokemon' }
      case 'x':
        return { id: id.replace('x', ''), type: 'pokemon' }
      case 'd':
        return { id: 3, type: 'quest_reward' }
      case 't':
        return { id: id.split('-')[0].replace('t', ''), type: 'gym' }
      default:
        return { id: id.split('-')[0], form: id.split('-')[1], type: 'pokemon' }
    }
  }

  static getTitles(idObj) {
    switch (idObj.type) {
      case 'egg':
        return idObj.id === '90' ? ['poke_global'] : [`egg_${idObj.id}_plural`]
      case 'incident':
        if (idObj.id === 'gold-stop') return ['gold_stop']
        if (idObj.id === 'kecleon') return ['poke_352']
        if (idObj.id === 'showcase') return ['showcase']
        // unknown display type: no locale key exists, so give a readable title
        return [`${t('incident')} ${idObj.id}`]
      case 'invasion':
        return idObj.id === '0' ? ['poke_global'] : [`grunt_a_${idObj.id}`]
      case 'lure':
        return [`lure_${idObj.id}`]
      case 'raid':
        return idObj.id === '90' ? ['poke_global'] : [`raid_${idObj.id}_plural`]
      case 'pokemon':
        return idObj.id === '0'
          ? ['poke_global']
          : [`poke_${idObj.id}`, +idObj.form ? `form_${idObj.form}` : '']
      case 'gym':
        return idObj.id === '4' ? ['poke_global'] : [`team_${idObj.id}`]
      default:
        return [`${idObj.type}_${idObj.id}`]
    }
  }

  /**
   *
   * @param {object} item
   * @param {Exclude<import('@store/useWebhookStore').WebhookStore['category'], 'human'>} category
   * @returns {string}
   */
  static generateDescription(item, category) {
    if (typeof item.description === 'string' && item.description) {
      return item.description
    }
    const { leagues } = useWebhookStore.getState().context
    switch (category) {
      case 'invasion': {
        const gruntId = ruleId(
          'invasion',
          item,
          useMemory.getState().masterfile.invasions,
        )
        let name = t(
          gruntId === 'i0' ? 'poke_global' : `grunt_${gruntId.slice(1)}`,
        )
        if (!item.gender || item.gender === 'any') {
          name = name.replace(/\(.+?\)/g, `(${t('all')})`)
        }
        return `${name}${item.clean ? ` | ${t('clean')} ` : ''}${
          item.distance ? ` | d${item.distance}` : ''
        }`
      }
      case 'incident': {
        const id = ruleId('incident', item)
        const key = {
          'gold-stop': 'gold_stop',
          kecleon: 'poke_352',
          showcase: 'showcase',
        }[id]
        const name = key ? t(key) : `${t('incident')} ${item.display_type}`
        return `${name}${item.clean ? ` | ${t('clean')} ` : ''}${
          item.distance ? ` | d${item.distance}` : ''
        }`
      }
      case 'lure':
        return `${t(`lure_${item.lure_id}`)}${
          item.clean ? ` | ${t('clean')} ` : ''
        }${item.distance ? ` | d${item.distance}` : ''}`
      case 'quest':
        return `${t(
          `quest_reward_${item.reward_type}`,
        )} | ${(function getReward() {
          switch (item.reward_type) {
            case 2:
              return `${t(`item_${item.reward}`)}${
                item.amount ? ` | x${item.amount}` : ''
              }`
            case 3:
              return `x${item.amount}`
            case 4:
              return `${t(`poke_${item.reward}`)}${
                item.amount ? ` | x${item.amount}` : ''
              }`
            case 7:
              return `${t(`poke_${item.reward}`)} ${t('form')}: ${t(
                `form_${item.form}`,
              )}`
            case 12:
              return `${t(`poke_${item.reward}`)}${
                item.amount ? ` | x${item.amount}` : ''
              }`
            default:
              return ''
          }
        })()}${item.clean ? ` | ${t('clean')} ` : ''}${
          item.distance ? ` | d${item.distance}` : ''
        }`
      // case 'gym': return `${t(`team_${item.team}`)} ${item.gym_id ? item.name : ''}`
      // case 'raid':
      // case 'egg': return `Level ${item.level} ${item.exclusive ? 'Exclusive Only' : ''} ${item.clean ? 'clean' : ''} Template: ${item.template} ${item.team === 4 ? '' : item.team} ${item.gym_id ? 'Gym:' : ''}${item.distance ? ` | d${item.distance}` : ''}`
      case 'nest':
        return `${t(`poke_${item.pokemon_id}`)} | Min Spawn: ${
          item.min_spawn_avg
        }${item.clean ? ` | ${t('clean')} ` : ''}${
          item.distance ? ` | d${item.distance}` : ''
        }`
      case 'pokemon':
        return `${
          item.pokemon_id
            ? ` ${t(`poke_${item.pokemon_id}`)} | `
            : ` ${t('poke_global')} | `
        }${item.form ? ` ${t(`form_${item.form}`)} | ` : ''}${
          item.pvp_ranking_league
            ? `${t('pvp')} ${t(
                leagues.find((league) => league.cp === item.pvp_ranking_league)
                  .name,
              )} ${item.pvp_ranking_best}-${item.pvp_ranking_worst} ${
                item.pvp_ranking_min_cp
                  ? `${item.pvp_ranking_min_cp}${t('cp')}`
                  : ''
              } ${
                item.pvp_ranking_cap ? `${t('cap')}${item.pvp_ranking_cap}` : ''
              }${item.clean ? ` | ${t('clean')} ` : ''}${
                item.distance ? ` | d${item.distance}` : ''
              }`
            : `${item.min_iv ?? 0}-${item.max_iv ?? 100}% | L${
                item.min_level ?? 1
              }-${item.max_level ?? 55}
      A${item.atk ?? 0}-${item.max_atk ?? 15} | D${item.def ?? 0}-${
        item.max_def ?? 15
      } | S${item.sta ?? 0}-${item.max_sta ?? 15}${item.clean ? ` | ${t('clean')} ` : ''}${
        item.distance ? ` | d${item.distance}` : ''
      }`
        }${
          item.size > 1 || item.max_size < 5
            ? ` | ${t('size', 'Size')}:${
                item.size === item.max_size
                  ? `size:${t(`size_${item.size}`)}`
                  : `size:${t(`size_${item.size}`)}-${t(
                      `size_${item.max_size}`,
                    )}`
              }`
            : ''
        }`
      default:
        return item.description || ''
    }
  }

  /** @param {string} id */
  static getOtherData(id) {
    switch (id.charAt(0)) {
      case 'e':
      case 'r':
        return { level: +id.slice(1) }
      default:
        return { pokemon_id: +id.split('-')[0], form: +id.split('-')[1] || 0 }
    }
  }
}

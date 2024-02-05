/* eslint-disable no-fallthrough */
// @ts-check
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * @typedef {{ plural?: boolean, amount?: boolean, alt?: boolean, newLine?: boolean }} CustomTOptions
 * @typedef {(id: string, options?: CustomTOptions) => string} CustomT
 */

/**
 * @param {CustomTOptions} options
 * @returns {{ language: string, t: CustomT }}
 */
export function useTranslateById(options = {}) {
  const i18n = useTranslation()
  const formsToIgnore = useRef(new Set([i18n.t('form_0'), i18n.t('form_29')]))

  useEffect(() => {
    formsToIgnore.current = new Set([i18n.t('form_0'), i18n.t('form_29')])
  }, [i18n.i18n.language])

  return useMemo(
    () => ({
      language: i18n.i18n.language,
      t: (id, { plural, amount, alt, newLine } = options) => {
        if (typeof id !== 'string') {
          return ''
        }
        if (id === 'kecleon') {
          id = 'b8'
        } else if (id === 'gold-stop') {
          id = 'b7'
        } else if (id === 'showcase') {
          id = 'b9'
        }
        if (id === 'global' || id === 'all') {
          return i18n.t(id)
        }
        if (
          id === '0-0' ||
          id === 'e90' ||
          id === 'r90' ||
          id === 't4' ||
          id === 'i0'
        )
          return i18n.t('poke_global')
        switch (id.charAt(0)) {
          case 'b':
            // event stops
            return i18n.t(`display_type_${id.slice(1)}`)
          case 'c':
            // candy
            return `${i18n.t(`poke_${id.slice(1)}`)} (${i18n.t(
              'quest_reward_4',
            )})`
          case 'd': {
            const a = amount ? id.slice(1) : ''
            return `${i18n.t('quest_reward_3')}${a}`
          }
          case 'e':
            // raid eggs
            return i18n.t(`egg_${id.slice(1)}${plural ? '_plural' : ''}`)
          case 'g':
          case 'h':
            return i18n.t(`poke_type_${id.slice(1)}`)
          case 't':
            // gyms
            // teams
            return i18n.t(
              `team${alt ? '_a' : ''}_${id.slice(1).split('-').at(0)}`,
            )
          case 'i':
            // invasions
            return i18n.t(`grunt${alt ? '_a' : ''}_${id.slice(1)}`)
          case 'l':
            // lures
            return i18n.t(`lure_${id.slice(1)}`)
          case 'm': {
            // mega energy
            const a = amount ? `(${id.slice(1).split('-')[1]})` : ''
            return `${i18n.t(`poke_${id.slice(1).split('-')[0]}`)} ${a}`
          }
          case 'p': {
            // experience
            const a = amount ? id.slice(1) : ''
            return `${i18n.t('quest_reward_1')}${a}`
          }
          case 'q': {
            // items
            const a = amount ? `(${id.slice(1).split('-')[1]})` : ''
            return `${i18n.t(`item_${id.slice(1).split('-')[0]}`)}${a}`
          }
          case 'r':
            // unconfirmed but hatched raids
            return i18n.t(`raid_${id.slice(1)}${plural ? '_plural' : ''}`)
          case 's':
            // ...base pokestop maybe?
            return i18n.t('pokestops')
          case 'u':
            // quest types
            return i18n.t(`quest_reward_${id.slice(1)}`)
          case 'x':
            // xl candy
            return `${i18n.t(`poke_${id.slice(1)}`)} (${i18n.t(
              'quest_reward_9',
            )})`
          case 'a':
          // rocket pokemon
          case 'f':
            // showcase mons
            id = id.slice(1)
          default: {
            // pokemon
            const [pokemon, form] = id.split('-', 2)
            const pokemonName = i18n.t(`poke_${pokemon}`)
            const possibleForm = i18n.t(`form_${form}`)
            const formName = formsToIgnore.current.has(possibleForm)
              ? ''
              : `${newLine ? '\n' : ' '}(${possibleForm})`
            return `${pokemonName}${formName}`
          }
        }
      },
    }),
    [i18n, options.alt, options.amount, options.plural, options.newLine],
  )
}

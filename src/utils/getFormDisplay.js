// @ts-check
import { t as translate } from 'i18next'

const DEFAULT_IGNORED_FORM_KEYS = ['form_0', 'form_45']
const ALWAYS_SHOW_FORM_POKEMON = new Set([51]) // Dugtrio (51) needs form labels

/**
 * Formats a pokemon form or costume label using shared translations.
 *
 * @param {number | string | null | undefined} pokemonId
 * @param {number | string | null | undefined} form
 * @param {number | string | null | undefined} costume
 * @param {{ showDefaultForms?: boolean, appendFormSuffix?: boolean }} [options]
 * @returns {string}
 */
export function getFormDisplay(pokemonId, form, costume, options = {}) {
  if (costume) {
    const costumeKey = `costume_${costume}`
    const costumeLabel = translate(costumeKey)
    if (costumeLabel && costumeLabel !== costumeKey) {
      return costumeLabel
    }
    return translate('unknown_costume')
  }

  if (form === null || form === undefined || form === '') {
    return ''
  }

  const formKey = `form_${form}`
  const formName = translate(formKey)

  if (!formName || formName === formKey) {
    return `${translate('form')} ${form}`
  }

  const { showDefaultForms = false, appendFormSuffix = true } = options
  if (!showDefaultForms) {
    const normalizedPokemonId =
      typeof pokemonId === 'number'
        ? pokemonId
        : typeof pokemonId === 'string'
          ? Number(pokemonId)
          : Number.NaN
    if (
      !(
        Number.isFinite(normalizedPokemonId) &&
        ALWAYS_SHOW_FORM_POKEMON.has(normalizedPokemonId)
      ) &&
      DEFAULT_IGNORED_FORM_KEYS.some((key) => translate(key) === formName)
    )
      return ''
  }

  if (!appendFormSuffix) return formName

  const suffix = ` ${translate('form')}`
  return formName.endsWith(suffix) ? formName : `${formName}${suffix}`
}

// @ts-check

/**
 * Resolve showcase event icon metadata for marker and popup rendering.
 * @param {{
 *  display_type: number | string,
 *  showcase_pokemon_id?: number | null,
 *  showcase_pokemon_form_id?: number | null,
 *  showcase_pokemon_type_id?: number | null,
 * }} event
 * @param {any} Icons
 * @returns {{
 *  url: string,
 *  decoration: boolean,
 *  tooltipKey: string | null,
 *  sizeFilterKey: string,
 * }}
 */
export function resolveShowcaseEventIcon(event, Icons) {
  if (event.showcase_pokemon_id) {
    const formId = event.showcase_pokemon_form_id ?? 0
    return {
      url: Icons.getPokemon(event.showcase_pokemon_id, formId),
      decoration: true,
      tooltipKey: `poke_${event.showcase_pokemon_id}`,
      sizeFilterKey: `f${event.showcase_pokemon_id}-${formId}`,
    }
  }
  if (event.showcase_pokemon_type_id) {
    return {
      url: Icons.getTypes(event.showcase_pokemon_type_id),
      decoration: true,
      tooltipKey: `poke_type_${event.showcase_pokemon_type_id}`,
      sizeFilterKey: `h${event.showcase_pokemon_type_id}`,
    }
  }
  return {
    url: Icons.getEventStops(event.display_type),
    decoration: false,
    tooltipKey: null,
    sizeFilterKey: `b${event.display_type}`,
  }
}

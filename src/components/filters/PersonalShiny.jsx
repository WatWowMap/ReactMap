// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'

import { useDeepStore, useStorage } from '@store/useStorage'
import { SliderTile } from '@components/inputs/SliderTile'

/** @type {import('@rm/types').RMSlider} */
const SLIDER = {
  name: 'personal_shiny_iv',
  i18nKey: 'personal_shiny_iv',
  label: '%',
  min: 0,
  max: 100,
  color: 'secondary',
}
const FULL_RANGE = [0, 100]

/** Personal shinies are off: their filters can't be set and are ignored */
export const usePersonalShinyOff = () =>
  useStorage((s) => (s.filters?.pokemon?.personalShinyMode || 'off') === 'off')

/** Only personal shinies: the shiny IV ranges take over the IV ranges */
export const usePersonalShinyOnly = () =>
  useStorage((s) => s.filters?.pokemon?.personalShinyMode === 'only')

/**
 * The IV range of a Pokémon filter for the Pokémon that are shiny for the
 * user: those are shown when they are within it and match the filter's other
 * conditions, next to the ones the regular IV range shows. Like the other
 * ranges, 0-100 sets no condition.
 * @param {{
 *  field: string,
 *  disabled?: boolean,
 *  onChange?: (key: 'personal_shiny_iv', values: number[]) => void,
 * }} props onChange: the advanced filter's handler, which also turns the
 *  filter on like its other sliders do
 */
export function PersonalShinyFilter({ field, disabled = false, onChange }) {
  const off = usePersonalShinyOff()
  const [range, setRange] = useDeepStore(
    /** @type {any} */ (`${field}.personal_shiny_iv`),
    FULL_RANGE,
  )

  const handleRange = React.useCallback(
    (_name, values) =>
      onChange ? onChange('personal_shiny_iv', values) : setRange(values),
    [onChange, setRange],
  )

  return (
    <ListItem disableGutters disablePadding>
      <SliderTile
        slide={{ ...SLIDER, disabled: disabled || off }}
        handleChange={handleRange}
        values={range}
      />
    </ListItem>
  )
}

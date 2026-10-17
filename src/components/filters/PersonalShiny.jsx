// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'

import { useDeepStore } from '@store/useStorage'
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

/**
 * The IV range of a Pokémon filter for the Pokémon that are shiny for the
 * user: those are shown when they are within it and match the filter's other
 * conditions, next to the ones the regular IV range shows. Like the other
 * ranges, 0-100 sets no condition.
 * @param {{ field: string, disabled?: boolean }} props
 */
export function PersonalShinyFilter({ field, disabled = false }) {
  const [range, setRange] = useDeepStore(
    /** @type {any} */ (`${field}.personal_shiny_iv`),
    FULL_RANGE,
  )

  const handleRange = React.useCallback(
    (_name, values) => setRange(values),
    [setRange],
  )

  return (
    <ListItem disableGutters disablePadding>
      <SliderTile
        slide={{ ...SLIDER, disabled }}
        handleChange={handleRange}
        values={range}
      />
    </ListItem>
  )
}

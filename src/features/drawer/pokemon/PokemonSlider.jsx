// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'

import { useMemory } from '@store/useMemory'
import { useStorage, setDeepStore } from '@store/useStorage'
import { SliderTile } from '@components/inputs/SliderTile'
import { analytics } from '@utils/analytics'

// The Shiny IV Range lives beside ivOr so it never feeds the global filter
const SHINY_IV = 'shinyIv'

/** @type {import('@rm/types').RMSliderHandleChange<keyof import('@rm/types').PokemonFilter | typeof SHINY_IV>} */
const handleChange = (name, values) => {
  const { ivOr } = useMemory.getState().filters.pokemon
  if (name === SHINY_IV) {
    setDeepStore(`filters.pokemon.${SHINY_IV}`, values)
  } else if (name in ivOr) {
    setDeepStore(`filters.pokemon.ivOr.${name}`, values)
  }
  analytics('Global Pokemon', `${name}: ${values}`, `Pokemon Text`)
}

/** @param {{ slider: import('@rm/types').RMSlider }} props */
export function PokemonSlider({ slider }) {
  const values = useStorage((s) =>
    slider.name === SHINY_IV
      ? s.filters.pokemon[SHINY_IV]
      : s.filters.pokemon.ivOr[slider.name],
  )
  return (
    <ListItem disablePadding>
      <SliderTile slide={slider} handleChange={handleChange} values={values} />
    </ListItem>
  )
}

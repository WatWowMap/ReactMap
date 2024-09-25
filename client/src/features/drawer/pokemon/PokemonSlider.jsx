// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'

import { useMemory } from '@store/useMemory'
import { useStorage, setDeepStore } from '@store/useStorage'
import { SliderTile } from '@components/inputs/SliderTile'
import { analytics } from '@utils/analytics'

/** @type {import('@rm/types').RMSliderHandleChange<keyof import('@rm/types').PokemonFilter>} */
const handleChange = (name, values) => {
  const { ivOr } = useMemory.getState().filters.pokemon
  if (name in ivOr) {
    setDeepStore(`filters.pokemon.ivOr.${name}`, values)
  }
  analytics('Global Pokemon', `${name}: ${values}`, `Pokemon Text`)
}

/** @param {{ slider: import('@rm/types').RMSlider }} props */
export function PokemonSlider({ slider }) {
  const values = useStorage((s) => s.filters.pokemon.ivOr[slider.name])
  return (
    <ListItem disablePadding>
      <SliderTile slide={slider} handleChange={handleChange} values={values} />
    </ListItem>
  )
}

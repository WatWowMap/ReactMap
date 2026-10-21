// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'

import { useMemory } from '@store/useMemory'
import { useStorage, setDeepStore } from '@store/useStorage'
import { SliderTile } from '@components/inputs/SliderTile'
import { analytics } from '@utils/analytics'
import { useHasShinyPlayers } from '@hooks/usePersonalShiny'
import { usePersonalShinyOnly } from '@components/filters/PersonalShiny'

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
  // with only personal shinies the shiny IV range takes over
  const only = usePersonalShinyOnly()
  const personalShiny = useMemory((s) => !!s.ui.pokemon?.personalShiny)
  const hasShinyPlayers = useHasShinyPlayers()
  const shinyOnly = only && personalShiny && hasShinyPlayers
  return (
    <ListItem disablePadding>
      <SliderTile
        slide={
          shinyOnly && slider.name === 'iv'
            ? { ...slider, disabled: true }
            : slider
        }
        handleChange={handleChange}
        values={values}
      />
    </ListItem>
  )
}

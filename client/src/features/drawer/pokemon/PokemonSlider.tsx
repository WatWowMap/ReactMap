import ListItem from '@mui/material/ListItem'
import { useMemory } from '@store/useMemory'
import { useStorage, setDeepStore } from '@store/useStorage'
import { SliderTile } from '@components/inputs/SliderTile'
import { analytics } from '@utils/analytics'

const handleChange: import('@rm/types').RMSliderHandleChange<
  keyof import('@rm/types').PokemonFilter
> = (name, values) => {
  const { ivOr } = useMemory.getState().filters.pokemon

  if (name in ivOr) {
    setDeepStore(`filters.pokemon.ivOr.${name}`, values)
  }
  analytics('Global Pokemon', `${name}: ${values}`, `Pokemon Text`)
}

export function PokemonSlider({
  slider,
}: {
  slider: import('@rm/types').RMSlider
}) {
  const values = useStorage((s) => s.filters.pokemon.ivOr[slider.name])

  return (
    <ListItem disablePadding>
      <SliderTile handleChange={handleChange} slide={slider} values={values} />
    </ListItem>
  )
}

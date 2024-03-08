// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'

import { useMemory } from '@store/useMemory'
import { useDeepStore } from '@store/useStorage'
import { SliderTile } from '@components/inputs/SliderTile'

const BaseNestSlider = () => {
  const slider = useMemory((s) => s.ui.nests?.sliders?.secondary?.[0])
  const [filters, setFilters] = useDeepStore(`filters.nests.avgFilter`)
  if (!filters || !slider) return null
  return (
    <ListItem>
      <SliderTile
        slide={slider}
        handleChange={(_, values) => setFilters(values)}
        values={filters}
      />
    </ListItem>
  )
}

export const NestSlider = React.memo(BaseNestSlider)

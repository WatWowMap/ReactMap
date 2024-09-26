// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'

import { useMemory } from '@store/useMemory'
import { useDeepStore, useStorage } from '@store/useStorage'
import { SliderTile } from '@components/inputs/SliderTile'
import { CollapsibleItem } from '../components/CollapsibleItem'

const BaseNestSlider = () => {
  const slider = useMemory((s) => s.ui.nests?.sliders?.secondary?.[0])
  const show = useStorage((s) => !!s.filters?.nests?.pokemon)
  const [filters, setFilters] = useDeepStore(`filters.nests.avgFilter`)
  if (!filters || !slider) return null
  return (
    <CollapsibleItem open={show}>
      <ListItem>
        <SliderTile
          slide={slider}
          handleChange={(_, values) => setFilters(values)}
          values={filters}
        />
      </ListItem>
    </CollapsibleItem>
  )
}

export const NestSlider = React.memo(BaseNestSlider)

// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Switch from '@mui/material/Switch'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { useStorage, useDeepStore } from '@store/useStorage'
import { SliderTile } from '@components/inputs/SliderTile'

import { CollapsibleItem } from './components/CollapsibleItem'

const RouteSlider = () => {
  const { t } = useTranslation()
  const enabled = useStorage((s) => !!s.filters?.routes?.enabled)
  const [filters, setFilters] = useDeepStore('filters.routes.distance')
  const [compactView, setCompactView] = useDeepStore(
    'userSettings.routes.compactView',
    true,
  )
  const baseDistance = useMemory.getState().filters?.routes?.distance

  /** @type {import('@rm/types').RMSlider} */
  const slider = React.useMemo(() => {
    const min = baseDistance?.[0] || 0
    const max = baseDistance?.[1] || 25
    return {
      color: 'secondary',
      disabled: false,
      min,
      max,
      i18nKey: 'distance',
      step: 0.5,
      name: 'distance',
      label: 'km',
    }
  }, [baseDistance])

  return (
    <CollapsibleItem open={enabled}>
      <ListItem
        secondaryAction={
          <Switch
            color="secondary"
            onChange={(_, checked) => setCompactView(checked)}
            checked={compactView !== false}
          />
        }
      >
        <ListItemText primary={t('compact_route_view')} />
      </ListItem>
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

function BaseRoutesDrawer({ subItem }) {
  return subItem === 'enabled' ? <RouteSlider /> : null
}

export const RoutesDrawer = React.memo(
  BaseRoutesDrawer,
  (prev, next) => prev.subItem === next.subItem,
)

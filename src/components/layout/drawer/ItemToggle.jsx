import React from 'react'
import { Switch, ListItem, ListItemText } from '@mui/material'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import { useStore } from '@hooks/useStore'

export default function ItemToggle({ category, subItem }) {
  const { t } = useTranslation()
  const filters = useStore((s) => s.filters)
  const { setFilters } = useStore.getState()

  if (
    (category === 's2cells' && subItem === 'cells') ||
    (category === 'nests' && subItem === 'sliders')
  ) {
    return null
  }

  return (
    <ListItem>
      <ListItemText
        primary={
          category === 'scanAreas' && subItem === 'enabled'
            ? t('show_polygons')
            : t(Utility.camelToSnake(subItem))
        }
      />
      {category === 'wayfarer' || category === 'admin' ? (
        <Switch
          checked={filters[subItem].enabled}
          onChange={() => {
            setFilters({
              ...filters,
              [subItem]: {
                ...filters[subItem],
                enabled: !filters[subItem].enabled,
              },
            })
          }}
        />
      ) : (
        <Switch
          checked={filters[category][subItem]}
          onChange={() => {
            setFilters({
              ...filters,
              [category]: {
                ...filters[category],
                [subItem]: !filters[category][subItem],
              },
            })
          }}
        />
      )}
    </ListItem>
  )
}

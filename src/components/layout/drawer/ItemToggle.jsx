// @ts-check
import * as React from 'react'
import { Switch, ListItem, ListItemText } from '@mui/material'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import { useStore } from '@hooks/useStore'

/**
 * Generic list item toggle with a switch and managed filter state
 * @param {{
 *  category: string,
 *  subItem: string,
 * } & import("@mui/material").ListItemProps} props
 * @returns {JSX.Element}
 */
export default function ItemToggle({ category, subItem, ...props }) {
  const { t } = useTranslation()
  const checked = useStore((s) =>
    category === 'wayfarer' || category === 'admin'
      ? s.filters[subItem].enabled
      : s.filters[category][subItem],
  )

  if (
    (category === 's2cells' && subItem === 'cells') ||
    (category === 'nests' && subItem === 'sliders')
  ) {
    return null
  }

  return (
    <ListItem {...props}>
      <ListItemText
        primary={
          category === 'scanAreas' && subItem === 'enabled'
            ? t('show_polygons')
            : t(Utility.camelToSnake(subItem))
        }
      />
      {category === 'wayfarer' || category === 'admin' ? (
        <Switch
          checked={checked}
          onChange={() =>
            useStore.setState((prev) => ({
              filters: {
                ...prev.filters,
                [subItem]: {
                  ...prev.filters[subItem],
                  enabled: !prev.filters[subItem].enabled,
                },
              },
            }))
          }
        />
      ) : (
        <Switch
          checked={checked}
          onChange={() => {
            useStore.setState((prev) => ({
              filters: {
                ...prev.filters,
                [category]: {
                  ...prev.filters[category],
                  [subItem]: !prev.filters[category][subItem],
                },
              },
            }))
          }}
        />
      )}
    </ListItem>
  )
}

// @ts-check
import * as React from 'react'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'

import { useStorage, useDeepStore } from '@store/useStorage'
import { S2_LEVELS } from '@assets/constants'
import { FCSelectListItem } from '@components/inputs/FCSelect'

import { CollapsibleItem } from './components/CollapsibleItem'

const S2Cells = () => {
  const { t } = useTranslation()
  const enabled = useStorage((s) => !!s.filters.s2cells.enabled)
  const [filters, setFilters] = useDeepStore('filters.s2cells.cells')
  const safe = React.useMemo(
    () =>
      Array.isArray(filters)
        ? filters
        : typeof filters === 'string'
        ? // @ts-ignore
          filters.split(',')
        : [],
    [filters],
  )
  return (
    <CollapsibleItem open={enabled}>
      <FCSelectListItem
        sx={{ mx: 'auto', width: '90%' }}
        value={safe}
        renderValue={(selected) =>
          Array.isArray(selected) ? selected.join(', ') : selected
        }
        multiple
        onChange={({ target }) =>
          setFilters(
            typeof target.value === 'string'
              ? target.value.split(',')
              : target.value,
          )
        }
      >
        {S2_LEVELS.map((level) => (
          <MenuItem key={level} value={level}>
            {t('level')} {level}
          </MenuItem>
        ))}
      </FCSelectListItem>
    </CollapsibleItem>
  )
}

function S2CellsComponent({ subItem }) {
  return subItem === 'enabled' ? <S2Cells /> : null
}

export const S2CellsDrawer = React.memo(
  S2CellsComponent,
  (prev, next) => prev.subItem === next.subItem,
)

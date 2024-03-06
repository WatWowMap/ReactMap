// @ts-check
import * as React from 'react'
import Box from '@mui/material/Box'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'

import { useStorage } from '@store/useStorage'
import { FORT_LEVELS } from '@assets/constants'
import { MultiSelectorStore } from '@components/inputs/MultiSelector'

import { CollapsibleItem } from './CollapsibleItem'
import { SelectorListMemo } from './SelectorList'

/** @param {{ category: 'pokestops' | 'gyms', subItem: string }} props */
const BaseAllForts = ({ category, subItem }) => {
  const { t } = useTranslation()
  const enabled = useStorage((s) => !!s.filters?.[category]?.[subItem])
  return (
    <CollapsibleItem open={enabled}>
      <ListItem>
        <ListItemText primary={t('power_up')} />
        <MultiSelectorStore
          field={`filters.${category}.levels`}
          items={FORT_LEVELS}
        />
      </ListItem>
      {category === 'gyms' && (
        <Box px={2}>
          <SelectorListMemo category={category} height={175} />
        </Box>
      )}
    </CollapsibleItem>
  )
}

export const AllForts = React.memo(BaseAllForts)

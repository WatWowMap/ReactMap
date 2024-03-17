// @ts-check
import * as React from 'react'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'

import { useStorage } from '@store/useStorage'
import { WAYFARER_OPTIONS } from '@assets/constants'
import { BoolToggle } from '@components/inputs/BoolToggle'

import { CollapsibleItem } from './components/CollapsibleItem'

/** @param {{ item: (typeof WAYFARER_OPTIONS)[number], index: number, disabled: boolean }} props */
const WayfarerOption = ({ item, index, disabled }) => {
  const { t } = useTranslation()
  return (
    <BoolToggle
      field={`filters.submissionCells.${item}`}
      disabled={disabled}
      label=""
    >
      <ListItemText inset>
        {index > 1
          ? t('s2_cell_level', { level: item.substring(1, 3) })
          : t(index ? 'include_sponsored' : 'poi')}
      </ListItemText>
    </BoolToggle>
  )
}
const SubmissionCells = () => {
  const enabled = useStorage((s) => !!s.filters?.submissionCells?.enabled)
  return (
    <CollapsibleItem open={enabled}>
      {WAYFARER_OPTIONS.map((item, i) => (
        <WayfarerOption key={item} item={item} index={i} disabled={!enabled} />
      ))}
    </CollapsibleItem>
  )
}

function BaseWayfarerDrawer({ subItem }) {
  return subItem === 'submissionCells' ? <SubmissionCells /> : null
}

export const WayfarerDrawer = React.memo(
  BaseWayfarerDrawer,
  (prev, next) => prev.subItem === next.subItem,
)

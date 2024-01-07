// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'

import { MultiSelectorStore } from '@components/layout/drawer/MultiSelector'
import { ICON_SIZES } from '@assets/constants'

/**
 * @param {{
 *  field: `filters.${import('@rm/types').AdvCategories}.filter.${string}`
 * } & import('@mui/material/ListItem').ListItemProps} props
 */
export default function Size({ field, ...props }) {
  const { t } = useTranslation()

  return (
    <ListItem {...props}>
      <ListItemText sx={{ pr: 2 }}>{t('icon_size')}</ListItemText>
      <MultiSelectorStore
        items={ICON_SIZES}
        field={`${field}.size`}
        defaultValue="md"
        disabled={props.disabled}
      />
    </ListItem>
  )
}

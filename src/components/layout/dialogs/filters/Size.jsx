// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'

import { MultiSelector } from '@components/layout/drawer/MultiSelector'
import { ICON_SIZES } from '@assets/constants'

/**
 * @param {{ field: string } & import('@mui/material/ListItem').ListItemProps} props
 */
export default function Size({ field, ...props }) {
  const { t } = useTranslation()

  return (
    <ListItem {...props}>
      <ListItemText sx={{ pr: 2 }}>{t('icon_size')}</ListItemText>
      <MultiSelector
        items={ICON_SIZES}
        field={`${field}.size`}
        disabled={props.disabled}
      />
    </ListItem>
  )
}

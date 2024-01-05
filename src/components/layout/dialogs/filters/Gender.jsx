// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'

import { MultiSelector } from '@components/layout/drawer/MultiSelector'
import { GENDERS } from '@assets/constants'

/**
 *
 * @param {{ field: string } & import('@mui/material').ListItemProps} props
 * @returns
 */
export function GenderListItem({ field, ...props }) {
  const { t } = useTranslation()
  return (
    <ListItem {...props}>
      <ListItemText>{t('gender')}</ListItemText>
      <MultiSelector
        items={GENDERS}
        tKey="gender_icon_"
        field={`${field}.gender`}
        disabled={props.disabled}
      />
    </ListItem>
  )
}

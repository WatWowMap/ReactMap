// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'

import { MultiSelectorStore } from '@features/drawer/MultiSelector'
import { ENUM_GENDER } from '@assets/constants'

/**
 *
 * @param {{
 *  field: `filters.pokemon.filter.${string}` | `filters.pokemon.ivOr`
 * } & import('@mui/material').ListItemProps} props
 * @returns
 */
export function GenderListItem({ field, ...props }) {
  const { t } = useTranslation()
  return (
    <ListItem {...props}>
      <ListItemText>{t('gender')}</ListItemText>
      <MultiSelectorStore
        items={ENUM_GENDER}
        tKey="gender_icon_"
        field={`${field}.gender`}
        disabled={props.disabled}
      />
    </ListItem>
  )
}

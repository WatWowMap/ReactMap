// @ts-check

import { ICON_SIZES } from '@assets/constants'
import { MultiSelectorStore } from '@components/inputs/MultiSelector'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'

/**
 * @typedef {(oldValue: (typeof ICON_SIZES)[number], newValue: (typeof ICON_SIZES)[number]) => void} SizeOnClick
 * @param {{
 *  field: `filters.${import('@rm/types').AdvCategories}.filter.${string}`
 *  noLabel?: boolean
 *  onClick?: SizeOnClick
 * } & Omit<import('@mui/material/ListItem').ListItemProps, 'onClick'>} props
 */
export function Size({ field, noLabel = false, onClick, ...props }) {
  const { t } = useTranslation()

  return (
    <ListItem {...props}>
      {!noLabel && <ListItemText sx={{ pr: 2 }}>{t('icon_size')}</ListItemText>}
      <MultiSelectorStore
        items={ICON_SIZES}
        field={`${field}.size`}
        defaultValue="md"
        onClick={onClick}
        disabled={props.disabled}
      />
    </ListItem>
  )
}

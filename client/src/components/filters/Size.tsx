import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'

import { MultiSelectorStore } from '@components/inputs/MultiSelector'
import { ICON_SIZES } from '@assets/constants'

export type SizeOnClick = (
  oldValue: (typeof ICON_SIZES)[number],
  newValue: (typeof ICON_SIZES)[number],
) => void

export function Size({
  field,
  noLabel = false,
  onClick,
  ...props
}: {
  field: `filters.${import('@rm/types').AdvCategories}.filter.${string}`
  noLabel?: boolean
  onClick?: SizeOnClick
} & Omit<import('@mui/material/ListItem').ListItemProps, 'onClick'>) {
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

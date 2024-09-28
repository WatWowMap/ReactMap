import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'
import { MultiSelectorStore } from '@components/inputs/MultiSelector'
import { ENUM_GENDER } from '@assets/constants'

export function GenderListItem({
  field,
  ...props
}: {
  field: `filters.pokemon.filter.${string}` | `filters.pokemon.ivOr`
} & import('@mui/material').ListItemProps) {
  const { t } = useTranslation()

  return (
    <ListItem {...props}>
      <ListItemText>{t('gender')}</ListItemText>
      <MultiSelectorStore
        disabled={props.disabled}
        field={`${field}.gender`}
        items={ENUM_GENDER}
        tKey="gender_icon_"
      />
    </ListItem>
  )
}

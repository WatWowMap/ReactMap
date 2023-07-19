import React from 'react'
import { ButtonGroup, Button } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function MultiSelector({
  filters,
  setFilters,
  category,
  filterKey,
  items,
  tKey,
  allowNone,
}) {
  const { t } = useTranslation()
  const filterValue =
    typeof filters === 'object' && category
      ? filters[category]?.[filterKey]
      : filters

  return (
    <ButtonGroup size="small">
      {items.map((item) => (
        <Button
          key={item}
          onClick={() => {
            if (typeof filters === 'object' && category) {
              setFilters({
                ...filters,
                [category]: {
                  ...filters[category],
                  [filterKey]:
                    item === filterValue && allowNone ? 'none' : item,
                },
              })
            } else {
              setFilters(item)
            }
          }}
          color={item === filterValue ? 'primary' : 'secondary'}
          variant={item === filterValue ? 'contained' : 'outlined'}
        >
          {t(tKey ? `${tKey}${item}` : item).trim() || t('any')}
        </Button>
      ))}
    </ButtonGroup>
  )
}

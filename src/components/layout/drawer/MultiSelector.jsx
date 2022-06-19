import React from 'react'
import { ButtonGroup, Button } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function MultiSelector({
  filters,
  setFilters,
  category,
  filterKey,
  items,
}) {
  const { t } = useTranslation()
  return (
    <ButtonGroup size="small">
      {items.map((item) => (
        <Button
          key={item}
          onClick={() =>
            setFilters({
              ...filters,
              [category]: {
                ...filters[category],
                [filterKey]: item,
              },
            })
          }
          color={
            item === filters[category][filterKey] ? 'primary' : 'secondary'
          }
          variant={
            item === filters[category][filterKey] ? 'contained' : 'outlined'
          }
        >
          {t(item)}
        </Button>
      ))}
    </ButtonGroup>
  )
}

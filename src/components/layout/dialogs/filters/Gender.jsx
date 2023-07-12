import * as React from 'react'
import { Grid, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import MultiSelector from '@components/layout/drawer/MultiSelector'

export default function GenderFilter({ category, filter, setFilter }) {
  const { t } = useTranslation()

  return (
    <>
      {category && (
        <Grid item xs={2}>
          <Typography>{t('gender')}</Typography>
        </Grid>
      )}
      <Grid
        item
        xs={category ? 10 : 12}
        sm={category ? undefined : 6}
        style={{ textAlign: category ? 'right' : 'center' }}
      >
        <MultiSelector
          category={category}
          filterKey="gender"
          items={[0, 1, 2, 3]}
          tKey="gender_icon_"
          filters={filter.gender}
          setFilters={setFilter}
        />
      </Grid>
    </>
  )
}

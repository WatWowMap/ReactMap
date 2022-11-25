import * as React from 'react'
import { Grid, Typography } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import MultiSelector from '@components/layout/drawer/MultiSelector'

export default function GenderFilter({ category, filter, setFilter }) {
  const { t } = useTranslation()

  return (
    <Grid
      container
      alignItems="center"
      justifyContent="flex-start"
      item
      xs={12}
      style={{ margin: '10px 0' }}
    >
      <Grid item xs={3}>
        <Typography>{t('gender')}</Typography>
      </Grid>
      <Grid item xs={9} style={{ textAlign: category ? 'right' : 'inherit' }}>
        <MultiSelector
          category={category}
          filterKey="gender"
          items={[0, 1, 2, 3]}
          tKey="gender_icon_"
          filters={filter.gender}
          setFilters={setFilter}
        />
      </Grid>
    </Grid>
  )
}

// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

import { useMapData } from '@hooks/useMapData'

import { TopRow } from './components/TopRow'
import { ResetGeneral } from './components/ResetGeneral'
import { ResetFilters } from './components/ResetFilters'
import { DataManagementNotification } from './components/Notification'
import { restoreDefault } from './hooks/store'

export function DataManagerPage() {
  const { t } = useTranslation()
  useMapData(true)

  React.useEffect(() => {
    restoreDefault()
  }, [])

  return (
    <Grid
      container
      height="100vh"
      width="100%"
      alignItems="center"
      justifyContent="center"
    >
      <Grid container alignItems="stretch" justifyContent="center">
        <Typography variant="h3" py={1} width="100%" align="center">
          {t('data_management')}
        </Typography>
        <TopRow />
        <ResetGeneral />
        <ResetFilters />
      </Grid>
      <DataManagementNotification />
    </Grid>
  )
}

// @ts-check
import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import Grid from '@mui/material/Unstable_Grid2'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'

import { hardReset } from '@services/functions/resetState'

import { BORDER_SX } from './Shared'
import { setNotification, useDataManagementStore } from '../hooks/store'

export function TopRow() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <Grid
      container
      alignItems="center"
      justifyContent="space-evenly"
      xs={12}
      columns={13}
      sx={BORDER_SX}
    >
      <Grid
        xs={6}
        component={Button}
        size="large"
        color="success.main"
        onClick={() => navigate('/')}
      >
        {t('go_back')}
      </Grid>
      <Divider
        orientation="vertical"
        flexItem
        sx={{ borderColor: 'ActiveBorder' }}
      />
      <Grid
        xs={6}
        size="large"
        component={Button}
        color="error.main"
        onClick={() => {
          hardReset()
          setNotification(t('reset_all'), 'all')
          navigate('/')
        }}
        onMouseEnter={() =>
          useDataManagementStore.setState({
            resetFiltersHover: true,
            resetGeneralHover: true,
          })
        }
        onMouseLeave={() =>
          useDataManagementStore.setState({
            resetFiltersHover: false,
            resetGeneralHover: false,
          })
        }
      >
        {t('reset_all')}
      </Grid>
    </Grid>
  )
}

// @ts-check

import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Unstable_Grid2'
import { hardReset } from '@utils/resetState'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { setNotification, useDataManagementStore } from '../hooks/store'
import { BORDER_SX } from './Shared'

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

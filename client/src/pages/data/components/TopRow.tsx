import { useNavigate } from 'react-router-dom'
import Grid from '@mui/material/Unstable_Grid2'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'
import { hardReset } from '@utils/resetState'

import { setNotification, useDataManagementStore } from '../hooks/store'

import { BORDER_SX } from './Shared'

export function TopRow() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <Grid
      container
      alignItems="center"
      columns={13}
      justifyContent="space-evenly"
      sx={BORDER_SX}
      xs={12}
    >
      <Grid
        color="success.main"
        component={Button}
        size="large"
        xs={6}
        onClick={() => navigate('/')}
      >
        {t('go_back')}
      </Grid>
      <Divider
        flexItem
        orientation="vertical"
        sx={{ borderColor: 'ActiveBorder' }}
      />
      <Grid
        color="error.main"
        component={Button}
        size="large"
        xs={6}
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

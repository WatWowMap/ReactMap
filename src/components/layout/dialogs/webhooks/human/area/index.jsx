// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Grid, Typography, Button } from '@mui/material'

import { setModeBtn } from '../../store'
import { AreaGroup } from './AreaGroup'
import { handleClick } from './AreaChip'
import { Selected } from './Selected'

const Areas = () => {
  const { t } = useTranslation()

  return (
    <Grid
      container
      item
      xs={12}
      justifyContent="center"
      alignItems="center"
      spacing={2}
      style={{ height: '100%' }}
    >
      <Grid item xs={6} sm={3}>
        <Typography variant="h6">{t('areas')}</Typography>
      </Grid>
      <Grid
        item
        xs={6}
        sm={3}
        textAlign="center"
        display={{ xs: 'block', sm: 'none' }}
      >
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={setModeBtn('areas')}
        >
          {t('choose_on_map')}
        </Button>
      </Grid>

      <Grid item xs={6} sm={3} style={{ textAlign: 'center' }}>
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={handleClick('none')}
        >
          {t('disable_all')}
        </Button>
      </Grid>
      <Grid item xs={6} sm={3} style={{ textAlign: 'center' }}>
        <Button
          size="small"
          variant="contained"
          color="secondary"
          onClick={handleClick('all')}
        >
          {t('enable_all')}
        </Button>
      </Grid>
      <Grid
        item
        xs={6}
        sm={3}
        textAlign="center"
        display={{ xs: 'none', sm: 'block' }}
      >
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={setModeBtn('areas')}
        >
          {t('choose_on_map')}
        </Button>
      </Grid>
      <AreaGroup />
      <Grid
        item
        container
        xs={12}
        alignItems="center"
        justifyContent="center"
      />
      <Grid item xs={12}>
        <Selected />
      </Grid>
    </Grid>
  )
}

export default React.memo(Areas, () => true)

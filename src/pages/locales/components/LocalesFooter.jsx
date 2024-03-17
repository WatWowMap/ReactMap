// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Button from '@mui/material/Button'
import GitHubIcon from '@mui/icons-material/GitHub'
import { useTranslation } from 'react-i18next'

import { downloadLocales } from '../hooks/store'
import { AllSwitch } from './AllSwitch'

const github = <GitHubIcon />

export function LocalesFooter() {
  const { t } = useTranslation()
  return (
    <Grid component="footer" container justifyContent="space-evenly" py={1}>
      <Grid xs={4} sm={2} className="flex-center">
        <AllSwitch />
      </Grid>
      <Grid xs={4} sm={2} className="flex-center">
        <Button onClick={downloadLocales}>{t('download')}</Button>
      </Grid>
      <Grid xs={4} sm={2} className="flex-center">
        <Button
          startIcon={github}
          color="secondary"
          href="https://github.com/WatWowMap/ReactMap"
          target="_blank"
        >
          {t('contribute')}
        </Button>
      </Grid>
    </Grid>
  )
}

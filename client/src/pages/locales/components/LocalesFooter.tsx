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
    <Grid container component="footer" justifyContent="space-evenly" py={1}>
      <Grid className="flex-center" sm={2} xs={4}>
        <AllSwitch />
      </Grid>
      <Grid className="flex-center" sm={2} xs={4}>
        <Button onClick={downloadLocales}>{t('download')}</Button>
      </Grid>
      <Grid className="flex-center" sm={2} xs={4}>
        <Button
          color="secondary"
          href="https://github.com/WatWowMap/ReactMap"
          startIcon={github}
          target="_blank"
        >
          {t('contribute')}
        </Button>
      </Grid>
    </Grid>
  )
}

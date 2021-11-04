import React from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Grid, Typography } from '@material-ui/core'

export default function WebhookError({ selectedWebhook }) {
  const { t } = useTranslation()

  return (
    <Grid container direction="column" justifyContent="center" alignItems="center" style={{ height: '100%' }}>
      <Grid item>
        <Typography variant="h4" align="center">
          {t('nonRegisteredHumanTitle')}
        </Typography>
        <br />
        <Typography variant="h6" align="center" style={{ whiteSpace: 'pre-line' }}>
          <Trans i18nKey="nonRegisteredHumanDesc">
            {{ webhook: selectedWebhook }}
          </Trans>
        </Typography>
        <br />
        <Typography variant="h6" align="center">
          {t('tryAgainLater')}
        </Typography>
      </Grid>
    </Grid>
  )
}

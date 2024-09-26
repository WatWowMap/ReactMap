// @ts-check
import React from 'react'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Unstable_Grid2'
import { useTranslation, Trans } from 'react-i18next'

import { useWebhookStore } from '@store/useWebhookStore'

export function WebhookError({ children }) {
  const { t } = useTranslation()
  const name = useWebhookStore((s) => s.context.name)
  return (
    <Grid
      container
      direction="column"
      justifyContent="center"
      alignItems="center"
      height="100%"
    >
      <Grid>
        <Typography variant="h4" align="center">
          {t('non_registered_human_title')}
        </Typography>
        <br />
        <Typography variant="h6" align="center" whiteSpace="pre-line">
          {children ?? (
            <Trans i18nKey="non_registered_human_desc">
              {{ webhook: name }}
            </Trans>
          )}
        </Typography>
        <br />
        <Typography variant="h6" align="center">
          {t('try_again_later')}
        </Typography>
      </Grid>
    </Grid>
  )
}

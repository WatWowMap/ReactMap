import * as React from 'react'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Unstable_Grid2'
import { useTranslation, Trans } from 'react-i18next'
import { useWebhookStore } from '@store/useWebhookStore'

export function WebhookError({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const name = useWebhookStore((s) => s.context.name)

  return (
    <Grid
      container
      alignItems="center"
      direction="column"
      height="100%"
      justifyContent="center"
    >
      <Grid>
        <Typography align="center" variant="h4">
          {t('non_registered_human_title')}
        </Typography>
        <br />
        <Typography align="center" variant="h6" whiteSpace="pre-line">
          {children ?? (
            <Trans i18nKey="non_registered_human_desc">
              {{ webhook: name }}
            </Trans>
          )}
        </Typography>
        <br />
        <Typography align="center" variant="h6">
          {t('try_again_later')}
        </Typography>
      </Grid>
    </Grid>
  )
}

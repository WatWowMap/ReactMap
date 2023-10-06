// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'
import { Trans } from 'react-i18next'
import { useWebhookStore } from '../../store'

export const Selected = () => {
  const selectedAreas = useWebhookStore((s) => s.human.area || [])
  return (
    <Typography variant="h6" align="center">
      <Trans i18nKey="selected_areas" count={selectedAreas.length}>
        {{ amount: selectedAreas.length }}
      </Trans>
    </Typography>
  )
}

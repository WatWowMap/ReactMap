// @ts-check

import Typography from '@mui/material/Typography'
import { useWebhookStore } from '@store/useWebhookStore'
import { useTranslation } from 'react-i18next'

export const Selected = () => {
  const { t } = useTranslation()
  const selectedAreas = useWebhookStore((s) => s.human.area)
  return (
    <Typography variant="h6" align="center">
      {t('selected_areas', { count: selectedAreas?.length || 0 })}
    </Typography>
  )
}

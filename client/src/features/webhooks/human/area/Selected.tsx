import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { useWebhookStore } from '@store/useWebhookStore'

export const Selected = () => {
  const { t } = useTranslation()
  const selectedAreas = useWebhookStore((s) => s.human.area)

  return (
    <Typography align="center" variant="h6">
      {t('selected_areas', { count: selectedAreas?.length || 0 })}
    </Typography>
  )
}

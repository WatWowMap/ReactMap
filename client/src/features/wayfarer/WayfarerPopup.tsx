import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

import { ErrorBoundary } from '@components/ErrorBoundary'
import { useAnalytics } from '@hooks/useAnalytics'

const GYM_THRESHOLD = [2, 6, 20]

export function WayfarerPopup({
  count_gyms,
  count_pokestops,
  total,
}: import('@rm/types/lib').Level14Cell & { total: number }) {
  const { t } = useTranslation()
  let untilNextGym =
    count_gyms < 3
      ? GYM_THRESHOLD[count_gyms] - total
      : t('never_alt', t('never'))
  if (
    (total === 1 && count_gyms < 1) ||
    (total === 5 && count_gyms < 2) ||
    (total === 19 && count_gyms < 3)
  ) {
    untilNextGym = t('next_submission')
  }

  useAnalytics('Popup', `Total Count: ${total}`, 'Submission Cell')

  return (
    <ErrorBoundary noRefresh style={{}} variant="h5">
      <Typography variant="h6" align="center">
        {t('s2_cell_level', { level: 14 })}
      </Typography>
      <Typography variant="subtitle2" align="center">
        {t('total_count')}: {total}
      </Typography>
      <Typography variant="subtitle2" align="center">
        {t('pokestops')}: {count_pokestops}
      </Typography>
      <Typography variant="subtitle2" align="center">
        {t('gyms')}: {count_gyms}
      </Typography>
      <Typography variant="subtitle2" align="center">
        {t('next_gym')}: {untilNextGym}
      </Typography>
    </ErrorBoundary>
  )
}

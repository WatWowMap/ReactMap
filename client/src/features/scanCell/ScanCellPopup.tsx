import * as React from 'react'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { ErrorBoundary } from '@components/ErrorBoundary'
import { getTimeUntil } from '@utils/getTimeUntil'
import { dayCheck } from '@utils/dayCheck'

export function ScanCellPopup({ id, updated }: import('@rm/types').ScanCell) {
  const { t } = useTranslation()
  const lastUpdated = updated * 1000
  const [timer, setTimer] = React.useState(getTimeUntil(lastUpdated))

  React.useEffect(() => {
    const timer2 = setTimeout(() => {
      setTimer(getTimeUntil(lastUpdated))
    }, 1000)

    return () => clearTimeout(timer2)
  })

  return (
    <ErrorBoundary noRefresh variant="h5">
      <Typography align="center" variant="h6">
        {t('s2_cell_level', { level: 15 })}
      </Typography>
      <Typography align="center" variant="subtitle2">
        {timer.str.replace('days', t('days')).replace('day', t('day'))}
      </Typography>
      <Typography align="center" variant="subtitle1">
        {t('last_updated')}:
      </Typography>
      <Typography align="center" variant="subtitle1">
        {dayCheck(Date.now() / 1000, updated)}
      </Typography>
      <Typography align="center" variant="subtitle1">
        {t('id')}: {id}
      </Typography>
    </ErrorBoundary>
  )
}

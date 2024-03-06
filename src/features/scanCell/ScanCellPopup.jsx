// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'
import { Trans, useTranslation } from 'react-i18next'

import { ErrorBoundary } from '@components/ErrorBoundary'
import { getTimeUntil } from '@utils/getTimeUntil'
import { dayCheck } from '@utils/dayCheck'

/**
 *
 * @param {import('@rm/types').ScanCell} props
 * @returns
 */
export function ScanCellPopup({ id, updated }) {
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
      <Typography variant="h6" align="center">
        <Trans i18nKey="s2_cell_level">{{ level: 15 }}</Trans>
      </Typography>
      <Typography variant="subtitle2" align="center">
        {timer.str.replace('days', t('days')).replace('day', t('day'))}
      </Typography>
      <Typography variant="subtitle1" align="center">
        {t('last_updated')}:
      </Typography>
      <Typography variant="subtitle1" align="center">
        {dayCheck(Date.now() / 1000, updated)}
      </Typography>
      <Typography variant="subtitle1" align="center">
        {t('id')}: {id}
      </Typography>
    </ErrorBoundary>
  )
}

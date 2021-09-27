import React, { useEffect } from 'react'
import { Typography } from '@material-ui/core'
import { Trans, useTranslation } from 'react-i18next'

import Utility from '@services/Utility'

export default function SubmissionCellPopup({ cell }) {
  const { t } = useTranslation()
  const gymThreshold = [2, 6, 20]
  let untilNextGym = t('never')
  if (cell.count_gyms < 3) {
    untilNextGym = gymThreshold[cell.count_gyms] - cell.count
  }
  if ((cell.count === 1 && cell.count_gyms < 1)
    || (cell.count === 5 && cell.count_gyms < 2)
    || (cell.count === 19 && cell.count_gyms < 3)) {
    untilNextGym = t('nextSubmission')
  }

  useEffect(() => {
    Utility.analytics('Popup', `Total Count: ${cell.count}`, 'Submission Cell')
  }, [])

  return (
    <>
      <Typography variant="h6" align="center">
        <Trans i18nKey="s2CellLevel">
          {{ level: cell.level }}
        </Trans>
      </Typography>
      <Typography variant="subtitle2" align="center">
        {t('totalCount')}: {cell.count}
      </Typography>
      <Typography variant="subtitle2" align="center">
        {t('pokestops')}: {cell.count_pokestops}
      </Typography>
      <Typography variant="subtitle2" align="center">
        {t('gyms')}: {cell.count_gyms}
      </Typography>
      <Typography variant="subtitle2" align="center">
        {t('nextGym')}: {untilNextGym}
      </Typography>
    </>
  )
}

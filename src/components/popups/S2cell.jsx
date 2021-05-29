import React, { useState, useEffect } from 'react'
import { Typography } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'

export default function S2CellPopup({ cell }) {
  const { t } = useTranslation()
  const { id, updated } = cell
  const lastUpdated = new Date(updated * 1000)
  const [timer, setTimer] = useState(Utility.getTimeUntil(lastUpdated))

  useEffect(() => {
    const timer2 = setTimeout(() => {
      setTimer(Utility.getTimeUntil(lastUpdated))
    }, 1000)
    return () => clearTimeout(timer2)
  })
  return (
    <>
      <Typography variant="h6" align="center">{t('level15S2Cell')}</Typography>
      <Typography variant="subtitle2" align="center">
        {timer.str}
      </Typography>
      <Typography variant="subtitle1" align="center">
        {t('lastUpdated')}: {(new Date(updated * 1000)).toLocaleTimeString()}
      </Typography>
      <Typography variant="subtitle1" align="center">
        {t('id')}: {id}
      </Typography>
    </>
  )
}

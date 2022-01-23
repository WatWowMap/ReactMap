import React from 'react'
import {
  CircularProgress, Typography, Backdrop,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function Loading() {
  const { t } = useTranslation()
  return (
    <Backdrop open>
      <CircularProgress color="primary" />&nbsp;&nbsp;
      <Typography color="secondary" variant="h4">
        {t('loading')}
      </Typography>
    </Backdrop>
  )
}

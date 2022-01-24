import React from 'react'
import {
  CircularProgress, Typography, Backdrop,
} from '@material-ui/core'
import { Trans, useTranslation } from 'react-i18next'

export function Text({ category }) {
  const { t } = useTranslation()
  return (
    <Trans i18nKey="loading">
      {{ category: t(category) }}
    </Trans>
  )
}

export default function Loading({ category }) {
  return (
    <Backdrop open>
      <CircularProgress color="primary" />&nbsp;&nbsp;&nbsp;
      <Typography color="secondary" variant="h4">
        {category ? <Text category={category} /> : 'Loading Translations'}
      </Typography>
    </Backdrop>
  )
}

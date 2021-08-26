import React, { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Snackbar } from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { useTranslation, Trans } from 'react-i18next'

import Query from '@services/Query'
import SlideTransition from '@assets/mui/SlideTransition'
import { useStatic } from './useStore'

export default function useWebhook() {
  const { map: { webhook } } = useStatic(state => state.config)
  const { t } = useTranslation()
  const [addWebhook, { data }] = useMutation(Query.webhook())
  const [alert, setAlert] = useState(false)

  const handleAlertClose = () => {
    setAlert(false)
  }

  const setWebhook = (category, dataOjb) => ({
    name: (
      <Trans i18nKey="webhookEntry" key={category}>
        {{ name: webhook }}{{ category: t(category) }}
      </Trans>
    ),
    action: () => handleWebhook(category, dataOjb),
    key: category,
  })

  const handleWebhook = (category, dataObj = {}) => {
    if (category !== 'pokemon') category = `${category}s`
    addWebhook({
      variables: {
        category,
        dataObj,
      },
    })
    setAlert(category)
  }

  const StatusAlert = () => (
    <Snackbar
      open={Boolean(alert) && Boolean(data)}
      onClose={handleAlertClose}
      TransitionComponent={SlideTransition}
    >
      <Alert
        onClose={handleAlertClose}
        severity={data && data.webhook && data.webhook.status ? 'success' : 'error'}
        variant="filled"
      >
        {data && data.webhook && data.webhook.status
          ? t('webhookSuccess')
          : t('webhookFailed')}
      </Alert>
    </Snackbar>
  )

  return { setWebhook, StatusAlert, handleAlertClose }
}

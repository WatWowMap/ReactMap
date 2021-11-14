import React, { Fragment, useState } from 'react'
import { Snackbar } from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { useTranslation, Trans } from 'react-i18next'

import SlideTransition from '@assets/mui/SlideTransition'

export default function Notification({ severity, i18nKey, messages }) {
  const { t } = useTranslation()
  const [alert, setAlert] = useState(true)

  const handleClose = () => {
    setAlert(false)
  }

  return (
    <Snackbar
      open={alert}
      onClose={handleClose}
      TransitionComponent={SlideTransition}
    >
      <Alert
        onClose={handleClose}
        severity={severity}
        variant="filled"
        style={{ textAlign: 'center' }}
      >
        {messages.map((message, i) => (
          <Fragment key={message.key}>
            <Trans i18nKey={`${i18nKey}_${i}`}>
              {message.variables.map((variable, j) => ({ [`variable_${j}`]: t(variable) }))}
            </Trans>
            <br />
          </Fragment>
        ))}
      </Alert>
    </Snackbar>
  )
}

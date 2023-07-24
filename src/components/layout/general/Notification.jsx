import * as React from 'react'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Slide from '@mui/material/Slide'
import { useTranslation, Trans } from 'react-i18next'

function SlideTransition(props) {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <Slide {...props} direction="up" />
}

export default function Notification({
  open,
  severity,
  i18nKey,
  messages,
  cb,
}) {
  const { t } = useTranslation()
  const [alert, setAlert] = React.useState(true)

  const handleClose = () => {
    setAlert(false)
    if (cb) cb()
  }

  React.useEffect(() => {
    setAlert(open)
  }, [open])

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
        style={{ textAlign: 'center', color: 'white' }}
      >
        {i18nKey
          ? messages.map((message, i) => (
              <React.Fragment key={message.key}>
                <Trans i18nKey={`${i18nKey}_${i}`}>
                  {message.variables.map((variable, j) => ({
                    [`variable_${j}`]: t(variable),
                  }))}
                </Trans>
                <br />
              </React.Fragment>
            ))
          : messages}
      </Alert>
    </Snackbar>
  )
}

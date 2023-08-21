// @ts-check
import * as React from 'react'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Slide from '@mui/material/Slide'
import { useTranslation, Trans } from 'react-i18next'
import { AlertTitle } from '@mui/material'

function SlideTransition(props) {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <Slide {...props} direction="up" />
}

/** @type {React.CSSProperties} */
const alertStyle = { textAlign: 'center', color: 'white' }

/**
 *
 * @template T
 * @param {{
 *  open: boolean
 *  severity: import('@mui/material').AlertProps['severity']
 *  i18nKey?: T
 *  messages?: T extends string ? { key: string, variables: string[] }[] : React.ReactNode
 *  children?: T extends string ? never : React.ReactNode
 *  cb?: () => void
 *  title?: string
 * }} props
 * @returns
 */
export default function Notification({
  open,
  severity,
  i18nKey,
  messages,
  children,
  cb,
  title,
}) {
  const { t } = useTranslation()
  const [alert, setAlert] = React.useState(true)

  const handleClose = React.useCallback(() => {
    setAlert(false)
    if (cb) cb()
  }, [cb])

  React.useEffect(() => {
    setAlert(open)

    if (open) {
      const timer = setTimeout(() => {
        handleClose()
      }, 5000)
      return () => clearTimeout(timer)
    }
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
        style={alertStyle}
      >
        {title && <AlertTitle>{t(title)}</AlertTitle>}
        {typeof i18nKey === 'string' && Array.isArray(messages)
          ? messages.map((message, i) => (
              <React.Fragment key={message.key}>
                <Trans i18nKey={`${i18nKey}_${i}`}>
                  <>
                    {message.variables.map((variable, j) => ({
                      [`variable_${j}`]: t(variable),
                    }))}
                  </>
                </Trans>
                <br />
              </React.Fragment>
            ))
          : children}
      </Alert>
    </Snackbar>
  )
}

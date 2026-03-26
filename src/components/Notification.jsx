// @ts-check
import * as React from 'react'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Slide from '@mui/material/Slide'
import AlertTitle from '@mui/material/AlertTitle'
import { useTranslation, Trans } from 'react-i18next'

/** @param {import('@mui/material').SlideProps} props */
function SlideTransition(props) {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <Slide {...props} direction="up" />
}

/** @type {React.CSSProperties} */
const alertStyle = { textAlign: 'center', color: 'white' }
const DEFAULT_AUTO_HIDE_DURATION = 5000

/**
 *
 * @template T
 * @param {{
 *  open?: boolean
 *  severity: import('@mui/material').AlertProps['severity']
 *  i18nKey?: T
 *  messages?: T extends string ? { key: string, variables: string[] }[] : React.ReactNode
 *  children?: T extends string ? never : React.ReactNode
 *  cb?: () => void
 *  title?: string
 *  autoHideDuration?: number | null
 *  ignoreClickaway?: boolean
 *  closable?: boolean
 * }} props
 * @returns
 */
export function Notification({
  open,
  severity,
  i18nKey,
  messages,
  children,
  cb,
  title,
  autoHideDuration = DEFAULT_AUTO_HIDE_DURATION,
  ignoreClickaway = false,
  closable = true,
}) {
  const { t } = useTranslation()
  const [alert, setAlert] = React.useState(!!open)

  const handleClose = React.useCallback(() => {
    setAlert(false)
    if (cb) cb()
  }, [cb])

  const handleSnackbarClose = React.useCallback(
    (_, reason) => {
      if (reason === 'clickaway' && ignoreClickaway) return
      if (!closable) return
      handleClose()
    },
    [closable, handleClose, ignoreClickaway],
  )

  React.useEffect(() => {
    setAlert(!!open)

    if (open && typeof autoHideDuration === 'number') {
      const timer = setTimeout(() => {
        handleClose()
      }, autoHideDuration)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [autoHideDuration, handleClose, open])

  return (
    <Snackbar
      open={alert}
      onClose={handleSnackbarClose}
      TransitionComponent={SlideTransition}
    >
      <Alert
        onClose={closable ? handleClose : undefined}
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

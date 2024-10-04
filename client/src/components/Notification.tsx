import * as React from 'react'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Slide from '@mui/material/Slide'
import AlertTitle from '@mui/material/AlertTitle'
import { useTranslation, Trans } from 'react-i18next'

function SlideTransition(props: import('@mui/material').SlideProps) {
  return <Slide {...props} direction="up" />
}

const alertStyle: React.CSSProperties = { textAlign: 'center', color: 'white' }

export function Notification<T>({
  open,
  severity,
  i18nKey,
  messages,
  children,
  cb,
  title,
}: {
  open?: boolean
  severity: import('@mui/material').AlertProps['severity']
  i18nKey?: T
  messages?: T extends string
    ? { key: string; variables: string[] }[]
    : React.ReactNode
  children?: T extends string ? never : React.ReactNode
  cb?: () => void
  title?: string
}) {
  const { t } = useTranslation()
  const [alert, setAlert] = React.useState(open || false)

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
      TransitionComponent={SlideTransition}
      open={alert}
      onClose={handleClose}
    >
      <Alert
        severity={severity}
        style={alertStyle}
        variant="filled"
        onClose={handleClose}
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

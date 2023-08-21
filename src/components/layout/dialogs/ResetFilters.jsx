import * as React from 'react'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useLayoutStore } from '@hooks/useStore'

import Header from '../general/Header'
import Footer from '../general/Footer'
import { DialogWrapper } from './DialogWrapper'

export default function ResetFilters() {
  const { t } = useTranslation()
  const [redirect, setRedirect] = React.useState(false)

  const handleClose = React.useCallback(
    () => useLayoutStore.setState({ resetFilters: false }),
    [],
  )

  if (redirect) {
    return <Navigate push to="/reset" />
  }

  return (
    <DialogWrapper dialog="resetFilters" variant="small">
      <Header titles={[t('filters_reset_title')]} />
      <DialogContent>
        <Typography variant="subtitle1" align="center">
          {t('filters_reset_text')}
        </Typography>
        <br />
        <Typography align="center">
          <Button
            style={{ minWidth: 100 }}
            variant="contained"
            color="primary"
            size="small"
            onClick={() => {
              setRedirect(true)
              handleClose()
            }}
          >
            {t('confirm_filters_reset')}
          </Button>
        </Typography>
        <br />
      </DialogContent>
      <Footer
        options={[
          {
            name: 'close',
            action: handleClose,
            color: 'primary',
            align: 'right',
          },
        ]}
        role="webhook_footer"
      />
    </DialogWrapper>
  )
}

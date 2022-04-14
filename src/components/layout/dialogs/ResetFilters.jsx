import React, { useState } from 'react'
import {
  Button, Typography, DialogContent,
} from '@material-ui/core'
import { Redirect } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useStatic } from '@hooks/useStore'

import Header from '../general/Header'
import Footer from '../general/Footer'

export default function ResetFilters() {
  const { t } = useTranslation()
  const [redirect, setRedirect] = useState(false)
  const setResetFilters = useStatic(state => state.setResetFilters)

  if (redirect) {
    return <Redirect push to="/reset" />
  }
  return (
    <>
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
              setResetFilters(false)
            }}
          >
            {t('confirm_filters_reset')}
          </Button>
        </Typography>
        <br />
      </DialogContent>
      <Footer options={[{ name: 'close', action: () => setResetFilters(false), color: 'primary', align: 'right' }]} role="webhook_footer" />
    </>
  )
}

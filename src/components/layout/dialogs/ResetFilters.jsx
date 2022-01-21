import React, { useState } from 'react'
import {
  Button, Typography, Divider, DialogContent,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'
import Header from '../general/Header'
import Footer from '../general/Footer'
import { Redirect } from 'react-router-dom'

export default function ResetFilters({ setResetFilters }) {
  const { t } = useTranslation()
  const [redirect, setRedirect] = useState(false)

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
        <Divider />
        <br />
        <Typography align="center">
          <Button
            style={{ minWidth: 100 }}
            variant="contained"
            color="primary"
            size="small"
            onClick={() => 
				{ 
				setRedirect(true)
				setResetFilters(false) 
				}
			}
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

// @ts-check
import * as React from 'react'
import Create from '@mui/icons-material/Create'
import { Button, Typography, Divider, DialogContent } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useDialogStore, useStatic } from '@hooks/useStore'

import Header from '../general/Header'
import Footer from '../general/Footer'
import { DialogWrapper } from './DialogWrapper'

export default function Feedback() {
  const { t } = useTranslation()

  const link = useStatic((s) => s.config.map.feedbackLink)
  const handleClose = React.useCallback(
    () => useDialogStore.setState({ feedback: false }),
    [],
  )

  return (
    <DialogWrapper dialog="feedback" variant="small">
      <Header titles={[t('submit_feedback_title')]} action={handleClose} />
      <DialogContent>
        <Typography variant="subtitle1" align="center">
          {t('use_the_link_below')}
        </Typography>
        <br />
        <Divider />
        <br />
        <Typography variant="body2" align="center">
          <em>{t('feedback_to_devs')}</em>
        </Typography>
        <br />
        <Typography align="center">
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Create />}
            href={link}
            target="_blank"
            rel="noreferrer"
            style={{ justifyContent: 'center' }}
          >
            {t('feedback_form')}
          </Button>
        </Typography>
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

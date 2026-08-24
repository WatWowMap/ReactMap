// @ts-check

import Create from '@mui/icons-material/Create'
import Button from '@mui/material/Button'
import DialogContent from '@mui/material/DialogContent'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { useLayoutStore } from '@store/useLayoutStore'
import { useMemory } from '@store/useMemory'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { DialogWrapper } from './DialogWrapper'
import { Footer } from './Footer'
import { Header } from './Header'

export function Feedback() {
  const { t } = useTranslation()

  const link = useMemory((s) => s.config.links.feedbackLink)
  const handleClose = React.useCallback(
    () => useLayoutStore.setState({ feedback: false }),
    [],
  )

  return (
    <DialogWrapper dialog="feedback" variant="small">
      <Header titles={t('submit_feedback_title')} action={handleClose} />
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

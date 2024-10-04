import * as React from 'react'
import Create from '@mui/icons-material/Create'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import { useTranslation } from 'react-i18next'
import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'

import { Header } from './Header'
import { Footer } from './Footer'
import { DialogWrapper } from './DialogWrapper'

export function Feedback() {
  const { t } = useTranslation()

  const link = useMemory((s) => s.config.links.feedbackLink)
  const handleClose = React.useCallback(
    () => useLayoutStore.setState({ feedback: false }),
    [],
  )

  return (
    <DialogWrapper dialog="feedback" variant="small">
      <Header action={handleClose} titles={t('submit_feedback_title')} />
      <DialogContent>
        <Typography align="center" variant="subtitle1">
          {t('use_the_link_below')}
        </Typography>
        <br />
        <Divider />
        <br />
        <Typography align="center" variant="body2">
          <em>{t('feedback_to_devs')}</em>
        </Typography>
        <br />
        <Typography align="center">
          <Button
            color="secondary"
            href={link}
            rel="noreferrer"
            startIcon={<Create />}
            style={{ justifyContent: 'center' }}
            target="_blank"
            variant="contained"
          >
            {t('feedback_form')}
          </Button>
        </Typography>
      </DialogContent>
      <Footer
        i18nKey="webhook_footer"
        options={[
          {
            name: 'close',
            action: handleClose,
            color: 'primary',
            align: 'right',
          },
        ]}
      />
    </DialogWrapper>
  )
}

import React from 'react'
import {
  Button, Typography, Divider, DialogContent,
} from '@material-ui/core'
import { Create } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'
import Header from '../general/Header'
import Footer from '../general/Footer'

export default function Feedback({ link, setFeedback }) {
  const { t } = useTranslation()

  return (
    <>
      <Header titles={[t('submitFeedbackTitle')]} />
      <DialogContent>
        <Typography variant="subtitle1" align="center">
          {t('useTheLinkBelow')}
        </Typography>
        <br />
        <Divider />
        <br />
        <Typography variant="body2" align="center">
          <em>{t('feedbackToDevs')}</em>
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
            {t('feedbackForm')}
          </Button>
        </Typography>
      </DialogContent>
      <Footer options={[{ name: 'close', action: () => setFeedback(false), color: 'primary', align: 'right' }]} role="webhookFooter" />
    </>
  )
}

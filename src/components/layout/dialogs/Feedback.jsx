import React from 'react'
import {
  Button, Typography, Divider, DialogActions, DialogContent, DialogTitle,
} from '@material-ui/core'
import { Create } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

export default function Feedback({ link, setFeedback }) {
  const { t } = useTranslation()

  return (
    <>
      <DialogTitle>{t('submitFeedbackTitle')}</DialogTitle>
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
      <DialogActions>
        <Button onClick={() => setFeedback(false)} color="primary" autoFocus>
          {t('close')}
        </Button>
      </DialogActions>
    </>
  )
}

import React from 'react'
import {
  DialogTitle, DialogContent, DialogActions, Button, Typography,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import useStyles from '@hooks/useStyles'

export default function Motd({ messages, newMotdIndex, setMotdIndex }) {
  const { t } = useTranslation()
  const classes = useStyles()
  return (
    <>
      <DialogTitle className={classes.filterHeader}>{t('messageOfTheDay')}</DialogTitle>
      <DialogContent>
        {messages.map(message => (
          typeof message === 'string' ? (
            <Typography key={message} variant="subtitle1" align="center" style={{ margin: 20 }}>
              {message}
            </Typography>
          ) : (
            <div key={`${message.title}-${message.body}`} style={{ whiteSpace: 'pre-line', margin: 20, textAlign: 'center' }}>
              {message.title && (
                <Typography variant="h6">
                  {message.title}
                </Typography>
              )}
              {message.body && (
                <Typography variant="subtitle1">
                  {message.body}
                </Typography>
              )}
              {message.footer && (
                <Typography variant="caption">
                  {message.footer}
                </Typography>
              )}
            </div>
          )
        ))}
      </DialogContent>
      <DialogActions className={classes.filterFooter}>
        <Button onClick={() => setMotdIndex(newMotdIndex)} color="primary" autoFocus>
          {t('close')}
        </Button>
      </DialogActions>
    </>
  )
}

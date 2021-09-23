import React from 'react'
import { IconButton, DialogTitle } from '@material-ui/core'
import { Clear } from '@material-ui/icons'
import { Trans } from 'react-i18next'
import useStyles from '@hooks/useStyles'

export default function Header({ name, action }) {
  const classes = useStyles()

  return (
    <DialogTitle className={classes.filterHeader}>
      <Trans i18nKey="manageWebhook">
        {{ name }}
      </Trans>
      <IconButton
        onClick={action}
        style={{ position: 'absolute', right: 5, top: 5 }}
      >
        <Clear style={{ color: 'white' }} />
      </IconButton>
    </DialogTitle>
  )
}

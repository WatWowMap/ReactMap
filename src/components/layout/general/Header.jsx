import React from 'react'
import Clear from '@mui/icons-material/Clear'
import { IconButton, DialogTitle } from '@mui/material'

import { Trans, useTranslation } from 'react-i18next'
import useStyles from '@hooks/useStyles'

export default function Header({ names = [], titles, action }) {
  const classes = useStyles()
  const { t } = useTranslation()

  return (
    <DialogTitle className={classes.filterHeader}>
      {titles.map((title, index) =>
        names[index] ? (
          <Trans i18nKey={title} key={title}>
            {{ name: t(names[index]) }}
          </Trans>
        ) : (
          `${t(title)} `
        ),
      )}
      {Boolean(action) && (
        <IconButton
          onClick={action}
          style={{ position: 'absolute', right: 5, top: 2, color: 'white' }}
          size="large">
          <Clear />
        </IconButton>
      )}
    </DialogTitle>
  );
}

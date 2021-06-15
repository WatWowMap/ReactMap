import React, { Fragment } from 'react'
import {
  DialogContent, Typography, Divider,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'

const closing = [0, 1, 2, 3, 4]

export default function TutClosing() {
  const { t } = useTranslation()

  return (
    <DialogContent style={{ marginTop: 5 }}>
      {closing.map(i => (
        <Fragment key={i}>
          <Typography variant={i ? 'subtitle1' : 'h5'} align="center">
            {t(`tutorialClosing${i}`)}
          </Typography>
          <Divider light style={{ margin: 10 }} />
        </Fragment>
      ))}
    </DialogContent>
  )
}

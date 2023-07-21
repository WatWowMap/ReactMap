import React from 'react'
import { DialogContent, Typography, Divider } from '@mui/material'
import { useTranslation } from 'react-i18next'

export default function TutClosing() {
  const { t } = useTranslation()

  return (
    <DialogContent
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'column',
      }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <React.Fragment key={i}>
          <Typography variant={i ? 'subtitle1' : 'h4'} align="center">
            {t(`tutorial_closing_${i}`)}
          </Typography>
          {!!i && <Divider flexItem style={{ width: '100%' }} />}
        </React.Fragment>
      ))}
      <Typography variant="subtitle1" align="center">
        {t('tutorial_closing_5')}
      </Typography>
    </DialogContent>
  )
}

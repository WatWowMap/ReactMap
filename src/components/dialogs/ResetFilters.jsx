// @ts-check
import * as React from 'react'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import Grid2 from '@mui/material/Unstable_Grid2'
import Button from '@mui/material/Button'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useLayoutStore } from '@store/useLayoutStore'

import { Header } from './Header'
import { Footer } from './Footer'
import { DialogWrapper } from './DialogWrapper'

const handleClose = () => useLayoutStore.setState({ resetFilters: false })

const FOOTER_OPTIONS = /** @type {import('./Footer').FooterButton[]} */ ([
  {
    name: 'close',
    action: handleClose,
    color: 'primary',
    align: 'right',
  },
])

export default function ResetFilters() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <DialogWrapper dialog="resetFilters" variant="small">
      <Header titles={t('filters_reset_title')} />
      <Grid2
        component={DialogContent}
        className="flex-center"
        container
        rowGap={2}
      >
        <Grid2 xs={12} mt={2}>
          <Typography variant="subtitle1" align="center">
            {t('reset_or_manage_text')}
          </Typography>
        </Grid2>
        <Grid2 xs={12} sm={6} className="flex-center">
          <Button
            variant="contained"
            color="info"
            size="small"
            onClick={() => {
              handleClose()
              navigate('/data-management')
            }}
          >
            {t('data_management')}
          </Button>
        </Grid2>
        <Grid2 xs={12} sm={6} className="flex-center">
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={() => {
              handleClose()
              navigate('/reset')
            }}
          >
            {t('confirm_filters_reset')}
          </Button>
        </Grid2>
      </Grid2>
      <Footer options={FOOTER_OPTIONS} />
    </DialogWrapper>
  )
}

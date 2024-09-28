import * as React from 'react'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import Grid2 from '@mui/material/Unstable_Grid2'
import Button from '@mui/material/Button'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLayoutStore } from '@store/useLayoutStore'

import { Header } from './Header'
import { Footer, FooterButton } from './Footer'
import { DialogWrapper } from './DialogWrapper'

const handleClose = () => useLayoutStore.setState({ resetFilters: false })

const FOOTER_OPTIONS: FooterButton[] = [
  {
    name: 'close',
    action: handleClose,
    color: 'primary',
    align: 'right',
  },
]

export function ResetFilters() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <DialogWrapper dialog="resetFilters" variant="small">
      <Header titles={t('filters_reset_title')} />
      <Grid2
        container
        className="flex-center"
        component={DialogContent}
        rowGap={2}
      >
        <Grid2 mt={2} xs={12}>
          <Typography align="center" variant="subtitle1">
            {t('reset_or_manage_text')}
          </Typography>
        </Grid2>
        <Grid2 className="flex-center" sm={6} xs={12}>
          <Button
            color="info"
            size="small"
            variant="contained"
            onClick={() => {
              handleClose()
              navigate('/data-management')
            }}
          >
            {t('data_management')}
          </Button>
        </Grid2>
        <Grid2 className="flex-center" sm={6} xs={12}>
          <Button
            color="error"
            size="small"
            variant="contained"
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

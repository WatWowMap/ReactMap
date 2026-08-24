// @ts-check

import Button from '@mui/material/Button'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import Grid2 from '@mui/material/Unstable_Grid2'
import { useLayoutStore } from '@store/useLayoutStore'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { DialogWrapper } from './DialogWrapper'
import { Footer } from './Footer'
import { Header } from './Header'

const handleClose = () => useLayoutStore.setState({ resetFilters: false })

const FOOTER_OPTIONS = /** @type {import('./Footer').FooterButton[]} */ ([
  {
    name: 'close',
    action: handleClose,
    color: 'primary',
    align: 'right',
  },
])

export function ResetFilters() {
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

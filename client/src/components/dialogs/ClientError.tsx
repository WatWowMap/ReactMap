import Refresh from '@mui/icons-material/Refresh'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'
import { useMemory } from '@store/useMemory'

import { Header } from './Header'

export function ClientError() {
  const { t } = useTranslation()
  const error = useMemory((s) => s.clientError)

  return (
    <Dialog open={!!error}>
      <Header action={null} titles={`${error}_title`} />
      <DialogContent style={{ textAlign: 'center', whiteSpace: 'pre-line' }}>
        <br />
        <Typography variant="h6">{t(`${error}_body`)}</Typography>
        <br />
        <Typography variant="h6">{t('refresh_to_continue')}</Typography>
        <br />
        <Button
          color="primary"
          startIcon={<Refresh />}
          style={{ marginBottom: 20 }}
          variant="contained"
          onClick={() => window.location.reload()}
        >
          {t('refresh')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

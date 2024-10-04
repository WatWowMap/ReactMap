import Clear from '@mui/icons-material/Clear'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import { Trans, useTranslation } from 'react-i18next'

export function Header({
  names,
  titles,
  action,
}: {
  names?: string[]
  titles: string | string[]
  action?: () => void
}) {
  const { t } = useTranslation()

  return (
    <DialogTitle sx={{ bgcolor: 'secondary.main', color: 'white' }}>
      {(Array.isArray(titles) ? titles : [titles]).map((title, index) =>
        names?.[index] !== undefined ? (
          <Trans key={title} i18nKey={title}>
            {{ name: t(names[index]) }}
          </Trans>
        ) : (
          `${t(title)} `
        ),
      )}
      {Boolean(action) && (
        <IconButton
          size="large"
          style={{ position: 'absolute', right: 5, top: 2, color: 'white' }}
          onClick={action}
        >
          <Clear />
        </IconButton>
      )}
    </DialogTitle>
  )
}

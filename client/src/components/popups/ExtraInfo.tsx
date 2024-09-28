import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

export function ExtraInfo({
  title,
  data,
  children,
}: {
  title?: string
  data?: React.ReactNode
  children?: React.ReactNode
}) {
  const { t } = useTranslation()

  return (
    <Grid container direction="column" textAlign="center" xs={6}>
      {title && (
        <Grid>
          <Typography variant="subtitle2">{t(title)}:</Typography>
        </Grid>
      )}
      {data && (
        <Grid>
          <Typography variant="caption">{data}</Typography>
        </Grid>
      )}
      {children}
    </Grid>
  )
}

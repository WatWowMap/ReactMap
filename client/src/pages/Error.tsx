import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'
import { useHideElement } from '@hooks/useHideElement'

export function ErrorPage() {
  const { t, i18n } = useTranslation()
  const error = decodeURIComponent(window.location.href.split('/').pop())

  useHideElement()

  return (
    <Grid
      container
      alignItems="center"
      direction="column"
      justifyContent="center"
      minHeight="100cqh"
    >
      <Grid>
        <Typography align="center" variant={error.length > 4 ? 'h3' : 'h1'}>
          {error}
        </Typography>
      </Grid>
      <Grid>
        {i18n.exists(`errors_${error}`) && (
          <Typography align="center" variant="h6">
            {t(`errors_${error}`)}
          </Typography>
        )}
      </Grid>
      <Grid paddingTop={3}>
        <Button
          color="secondary"
          variant="contained"
          onClick={() => window.history.back()}
        >
          {t('go_back')}
        </Button>
      </Grid>
    </Grid>
  )
}

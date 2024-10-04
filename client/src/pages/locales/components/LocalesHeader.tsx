import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import Collapse from '@mui/material/Collapse'
import Button from '@mui/material/Button'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useTranslation } from 'react-i18next'
import { LocaleSelection } from '@components/inputs/LocaleSelection'

import { useLocalesStore } from '../hooks/store'

const expandMore = <ExpandMoreIcon />

export function LocalesHeader() {
  const { t, i18n } = useTranslation()
  const instructions = useLocalesStore((s) => s.instructions)

  return (
    <Grid container className="flex-center" component="header" p={2}>
      <Grid sm={4} xs={4}>
        <Typography variant="h4">{t('locales')}</Typography>
      </Grid>
      <Grid sm={4} xs={8}>
        <LocaleSelection />
      </Grid>
      <Grid sm={4} textAlign="right" xs={12}>
        <Button
          color="secondary"
          endIcon={expandMore}
          onClick={() =>
            useLocalesStore.setState((prev) => ({
              instructions: !prev.instructions,
            }))
          }
        >
          {t('instructions')}
        </Button>
      </Grid>
      <Grid component={Collapse} in={instructions} sm={8} xs={12}>
        <ol>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Typography key={i} component="li">
              {t(`locale_instructions_${i}`, { lng: i18n.language })}
            </Typography>
          ))}
        </ol>
      </Grid>
    </Grid>
  )
}

// @ts-check
import * as React from 'react'
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
    <Grid component="header" container className="flex-center" p={2}>
      <Grid xs={4} sm={4}>
        <Typography variant="h4">{t('locales')}</Typography>
      </Grid>
      <Grid xs={8} sm={4}>
        <LocaleSelection />
      </Grid>
      <Grid xs={12} sm={4} textAlign="right">
        <Button
          color="secondary"
          onClick={() =>
            useLocalesStore.setState((prev) => ({
              instructions: !prev.instructions,
            }))
          }
          endIcon={expandMore}
        >
          {t('instructions')}
        </Button>
      </Grid>
      <Grid component={Collapse} in={instructions} xs={12} sm={8}>
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

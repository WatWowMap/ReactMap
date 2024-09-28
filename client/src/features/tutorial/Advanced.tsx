import React, { useState } from 'react'
import Tune from '@mui/icons-material/Tune'
import Ballot from '@mui/icons-material/Ballot'
import Check from '@mui/icons-material/Check'
import Clear from '@mui/icons-material/Clear'
import Save from '@mui/icons-material/Save'
import HelpOutline from '@mui/icons-material/HelpOutline'
import FormatSize from '@mui/icons-material/FormatSize'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Unstable_Grid2'
import Box from '@mui/material/Box'
import { useTranslation } from 'react-i18next'
import { useMemory } from '@store/useMemory'
import { VirtualGrid } from '@components/virtual/VirtualGrid'
import { StandardItem } from '@components/virtual/StandardItem'
import { generateSlots } from '@utils/generateSlots'

import { tutorialData } from './data'

export function TutorialAdvanced({
  toggleHelp,
  category,
}: {
  toggleHelp?: () => void
  category?: keyof import('@rm/types').Available
}) {
  const { t } = useTranslation()
  const isMobile = useMemory((s) => s.isMobile)
  const [localCategory, setLocalCategory] = useState(category)
  const [isPokemon, setIsPokemon] = useState(localCategory === 'pokemon')

  const [tempFilters, setTempFilters] = useState({})

  const handleSwitch = () => {
    if (isPokemon) {
      setTempFilters({
        ...tutorialData.filters.gyms.filter,
        ...generateSlots('t3-0', true, tempFilters),
      })
    } else {
      setTempFilters(tutorialData.filters.pokemon.filter)
    }
    setLocalCategory(isPokemon ? 'gyms' : 'pokemon')
    setIsPokemon((prev) => !prev)
  }

  React.useEffect(() => {
    const newCategory = (category ?? isPokemon) ? 'pokemon' : 'gyms'

    setLocalCategory(newCategory)
    setTempFilters({
      ...tutorialData.filters[newCategory].filter,
      ...generateSlots('t3-0', true, {}),
    })
  }, [category])

  return (
    <DialogContent>
      <Grid
        container
        alignItems="center"
        direction="row"
        height="100%"
        justifyContent="center"
        spacing={1}
      >
        <Grid textAlign="center" xs={12}>
          <Typography variant="caption" whiteSpace="pre-line">
            {t('tutorial_toggle')}
          </Typography>
        </Grid>
        <Grid sm={8} xs={12}>
          <Box height={135}>
            <VirtualGrid data={tutorialData.tiles[localCategory]} xs={6}>
              {(_, key) => (
                <StandardItem caption category={localCategory} id={key} />
              )}
            </VirtualGrid>
          </Box>
        </Grid>
        <Grid textAlign="center" xs={12}>
          <Typography variant="caption" whiteSpace="pre-line">
            {isPokemon
              ? t('tutorial_pokemon_caption')
              : t('tutorial_all_caption')}
          </Typography>
        </Grid>
        <Grid xs={12}>
          <Divider light />
        </Grid>
        <Grid sm={4} textAlign="center" xs={3}>
          {isMobile ? <HelpOutline /> : <Typography>{t('help')}</Typography>}
        </Grid>
        <Grid sm={8} xs={9}>
          <Typography align="center" variant="subtitle2">
            {t('tutorial_help')}
          </Typography>
        </Grid>
        <Grid sm={4} textAlign="center" xs={3}>
          <Ballot />
        </Grid>
        <Grid sm={8} xs={9}>
          <Typography align="center" variant="subtitle2">
            {t('tutorial_adv_filter')}
          </Typography>
        </Grid>
        {isPokemon ? (
          <>
            <Grid sm={4} textAlign="center" xs={3}>
              {isMobile ? (
                <Tune />
              ) : (
                <Typography>{t('apply_to_all')}</Typography>
              )}
            </Grid>
            <Grid sm={8} xs={9}>
              <Typography align="center" variant="subtitle2">
                {t('tutorial_tune')}
              </Typography>
            </Grid>
          </>
        ) : (
          <>
            <Grid sm={4} textAlign="center" xs={3}>
              {isMobile ? (
                <FormatSize />
              ) : (
                <Typography>{t('apply_to_all')}</Typography>
              )}
            </Grid>
            <Grid sm={8} xs={9}>
              <Typography align="center" variant="subtitle2">
                {t('tutorial_format_size')}
              </Typography>
            </Grid>
          </>
        )}
        <Grid
          sm={4}
          sx={(theme) => ({
            color: theme.palette.error.main,
            textAlign: 'center',
          })}
          xs={3}
        >
          {isMobile ? <Clear /> : <Typography>{t('disable_all')}</Typography>}
        </Grid>
        <Grid sm={8} xs={9}>
          <Typography align="center" variant="subtitle2">
            {t('tutorial_clear')}
          </Typography>
        </Grid>
        <Grid
          sm={4}
          sx={(theme) => ({
            color: theme.palette.success.light,
            textAlign: 'center',
          })}
          xs={3}
        >
          {isMobile ? <Check /> : <Typography>{t('enable_all')}</Typography>}
        </Grid>
        <Grid sm={8} xs={9}>
          <Typography align="center" variant="subtitle2">
            {t('tutorial_check')}
          </Typography>
        </Grid>
        <Grid sm={4} textAlign="center" xs={3}>
          {isMobile ? (
            <Save color="secondary" />
          ) : (
            <Typography color="secondary">{t('save')}</Typography>
          )}
        </Grid>
        <Grid sm={8} xs={9}>
          <Typography align="center" variant="subtitle2">
            {t('tutorial_save')}
          </Typography>
        </Grid>
        {toggleHelp ? (
          <Grid textAlign="right" xs={12}>
            <Button color="secondary" size="small" onClick={toggleHelp}>
              {t('close')}
            </Button>
          </Grid>
        ) : (
          <Grid textAlign="center" xs={12}>
            <Button
              color="primary"
              size="small"
              variant="contained"
              onClick={handleSwitch}
            >
              {isPokemon
                ? t('tutorial_show_all_view')
                : t('tutorial_show_pokemon_view')}
            </Button>
          </Grid>
        )}
      </Grid>
    </DialogContent>
  )
}

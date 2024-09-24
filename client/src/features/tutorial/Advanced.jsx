// @ts-check

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

/**
 * @param {{ toggleHelp?: () => void, category?: keyof import('@rm/types').Available }} props
 */
export function TutorialAdvanced({ toggleHelp, category }) {
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
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={1}
        height="100%"
      >
        <Grid xs={12} textAlign="center">
          <Typography variant="caption" whiteSpace="pre-line">
            {t('tutorial_toggle')}
          </Typography>
        </Grid>
        <Grid xs={12} sm={8}>
          <Box height={135}>
            <VirtualGrid data={tutorialData.tiles[localCategory]} xs={6}>
              {(_, key) => (
                <StandardItem id={key} category={localCategory} caption />
              )}
            </VirtualGrid>
          </Box>
        </Grid>
        <Grid xs={12} textAlign="center">
          <Typography variant="caption" whiteSpace="pre-line">
            {isPokemon
              ? t('tutorial_pokemon_caption')
              : t('tutorial_all_caption')}
          </Typography>
        </Grid>
        <Grid xs={12}>
          <Divider light />
        </Grid>
        <Grid xs={3} sm={4} textAlign="center">
          {isMobile ? <HelpOutline /> : <Typography>{t('help')}</Typography>}
        </Grid>
        <Grid xs={9} sm={8}>
          <Typography variant="subtitle2" align="center">
            {t('tutorial_help')}
          </Typography>
        </Grid>
        <Grid xs={3} sm={4} textAlign="center">
          <Ballot />
        </Grid>
        <Grid xs={9} sm={8}>
          <Typography variant="subtitle2" align="center">
            {t('tutorial_adv_filter')}
          </Typography>
        </Grid>
        {isPokemon ? (
          <>
            <Grid xs={3} sm={4} textAlign="center">
              {isMobile ? (
                <Tune />
              ) : (
                <Typography>{t('apply_to_all')}</Typography>
              )}
            </Grid>
            <Grid xs={9} sm={8}>
              <Typography variant="subtitle2" align="center">
                {t('tutorial_tune')}
              </Typography>
            </Grid>
          </>
        ) : (
          <>
            <Grid xs={3} sm={4} textAlign="center">
              {isMobile ? (
                <FormatSize />
              ) : (
                <Typography>{t('apply_to_all')}</Typography>
              )}
            </Grid>
            <Grid xs={9} sm={8}>
              <Typography variant="subtitle2" align="center">
                {t('tutorial_format_size')}
              </Typography>
            </Grid>
          </>
        )}
        <Grid
          xs={3}
          sm={4}
          sx={(theme) => ({
            color: theme.palette.error.main,
            textAlign: 'center',
          })}
        >
          {isMobile ? <Clear /> : <Typography>{t('disable_all')}</Typography>}
        </Grid>
        <Grid xs={9} sm={8}>
          <Typography variant="subtitle2" align="center">
            {t('tutorial_clear')}
          </Typography>
        </Grid>
        <Grid
          xs={3}
          sm={4}
          sx={(theme) => ({
            color: theme.palette.success.light,
            textAlign: 'center',
          })}
        >
          {isMobile ? <Check /> : <Typography>{t('enable_all')}</Typography>}
        </Grid>
        <Grid xs={9} sm={8}>
          <Typography variant="subtitle2" align="center">
            {t('tutorial_check')}
          </Typography>
        </Grid>
        <Grid xs={3} sm={4} textAlign="center">
          {isMobile ? (
            <Save color="secondary" />
          ) : (
            <Typography color="secondary">{t('save')}</Typography>
          )}
        </Grid>
        <Grid xs={9} sm={8}>
          <Typography variant="subtitle2" align="center">
            {t('tutorial_save')}
          </Typography>
        </Grid>
        {toggleHelp ? (
          <Grid xs={12} textAlign="right">
            <Button onClick={toggleHelp} color="secondary" size="small">
              {t('close')}
            </Button>
          </Grid>
        ) : (
          <Grid xs={12} textAlign="center">
            <Button
              onClick={handleSwitch}
              variant="contained"
              color="primary"
              size="small"
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

import React, { useState } from 'react'
import {
  Grid, DialogContent, Typography, Divider, Button, Dialog,
} from '@material-ui/core'
import {
  Tune, Ballot, Check, Clear, Save, HelpOutline, FormatSize,
} from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'

import ReactWindow from '@components/layout/general/ReactWindow'
import Advanced from '../filters/Advanced'
import Tile from '../filters/MenuTile'
import SlotSelection from '../filters/SlotSelection'
import data from './data.json'

export default function TutAdvanced({ isMobile, toggleHelp, category }) {
  const { t } = useTranslation()
  const [isPokemon, setIsPokemon] = useState(category === 'pokemon')

  if (!category) {
    category = isPokemon ? 'pokemon' : 'gyms'
  }
  const [tempFilters, setTempFilters] = useState({
    ...data.filters[category].filter,
    ...Utility.generateSlots('t3-0', true, {}),
  })
  const [advancedFilter, setAdvancedFilter] = useState({
    open: false,
    id: '',
    tempFilters: {},
    default: data.filters.standard,
  })
  const [slotsMenu, setSlotsMenu] = useState({
    open: false,
    id: 0,
  })

  const advObject = {
    iv: true,
    pvp: true,
    sliders: {
      primary: [
        data.sliders[0],
        data.sliders[1],
        data.sliders[2],
      ],
      secondary: [
        data.sliders[3],
        data.sliders[4],
        data.sliders[5],
        data.sliders[6],
      ],
    },
  }
  const columnCount = isMobile ? 1 : 2

  const toggleAdvMenu = (open, id, newFilters) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    if (open) {
      setAdvancedFilter({
        open,
        id,
        tempFilters: tempFilters[id],
        standard: data.filters.pokemon.standard,
      })
    } else {
      setAdvancedFilter({ open })
      setTempFilters({ ...tempFilters, [id]: newFilters })
    }
  }

  const toggleSlotsMenu = (open, id, newFilters) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    if (open) {
      setSlotsMenu({
        open,
        id,
      })
    } else if (newFilters) {
      setSlotsMenu({ open })
      setTempFilters({ ...newFilters })
    } else {
      setSlotsMenu({ open })
    }
  }

  const handleSwitch = () => {
    if (isPokemon) {
      setTempFilters({
        ...data.filters.gyms.filter,
        ...Utility.generateSlots('t3-0', true, tempFilters),
      })
    } else {
      setTempFilters(data.filters.pokemon.filter)
    }
    setIsPokemon(!isPokemon)
  }

  return (
    <>
      <Dialog
        open={advancedFilter.open}
        onClose={toggleAdvMenu(false)}
      >
        <Advanced
          advancedFilter={advancedFilter}
          toggleAdvMenu={toggleAdvMenu}
          type={category}
          isTutorial={advObject}
        />
      </Dialog>
      <Dialog
        open={slotsMenu.open}
        onClose={toggleSlotsMenu(false)}
      >
        <SlotSelection
          teamId={slotsMenu.id}
          toggleSlotsMenu={toggleSlotsMenu}
          tempFilters={tempFilters}
        />
      </Dialog>
      <DialogContent>
        <Grid
          container
          direction="row"
          alignItems="center"
          justifyContent="center"
          spacing={1}
          style={{ height: '100%' }}
        >
          <Grid item xs={12} style={{ textAlign: 'center' }}>
            <Typography variant="caption" style={{ whiteSpace: 'pre-line' }}>
              {t('tutorial_toggle')}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={8} style={{ textAlign: 'center' }}>
            <div style={{ minHeight: '130px', textAlign: 'center' }}>
              <ReactWindow
                columnCount={columnCount}
                length={data.tiles[category].length}
                Tile={Tile}
                data={{
                  tileItem: data.tiles[category],
                  isMobile,
                  tempFilters,
                  setTempFilters,
                  toggleAdvMenu,
                  toggleSlotsMenu,
                  type: category,
                  Utility,
                }}
                offset={0}
              />
            </div>
          </Grid>
          <Grid item xs={12} style={{ textAlign: 'center' }}>
            <Typography variant="caption" style={{ whiteSpace: 'pre-line' }}>
              {isPokemon
                ? t('tutorial_pokemon_caption')
                : t('tutorial_all_caption')}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Divider light />
          </Grid>
          <Grid item xs={3} sm={4} style={{ textAlign: 'center' }}>
            {isMobile
              ? <HelpOutline style={{ color: 'white' }} />
              : <Typography>{t('help')}</Typography>}
          </Grid>
          <Grid item xs={9} sm={8}>
            <Typography variant="subtitle2" align="center">
              {t('tutorial_help')}
            </Typography>
          </Grid>
          <Grid item xs={3} sm={4} style={{ textAlign: 'center' }}>
            <Ballot style={{ color: 'white' }} />
          </Grid>
          <Grid item xs={9} sm={8}>
            <Typography variant="subtitle2" align="center">
              {t('tutorial_adv_filter')}
            </Typography>
          </Grid>
          {isPokemon ? (
            <>
              <Grid item xs={3} sm={4} style={{ textAlign: 'center' }}>
                {isMobile
                  ? <Tune style={{ color: 'white' }} />
                  : <Typography>{t('apply_to_all')}</Typography>}
              </Grid>
              <Grid item xs={9} sm={8}>
                <Typography variant="subtitle2" align="center">
                  {t('tutorial_tune')}
                </Typography>
              </Grid>
            </>
          ) : (
            <>
              <Grid item xs={3} sm={4} style={{ textAlign: 'center' }}>
                {isMobile
                  ? <FormatSize style={{ color: 'white' }} />
                  : <Typography>{t('apply_to_all')}</Typography>}
              </Grid>
              <Grid item xs={9} sm={8}>
                <Typography variant="subtitle2" align="center">
                  {t('tutorial_format_size')}
                </Typography>
              </Grid>
            </>
          )}
          <Grid item xs={3} sm={4} style={{ textAlign: 'center' }}>
            {isMobile
              ? <Clear color="primary" />
              : <Typography color="primary">{t('disable_all')}</Typography>}
          </Grid>
          <Grid item xs={9} sm={8}>
            <Typography variant="subtitle2" align="center">
              {t('tutorial_clear')}
            </Typography>
          </Grid>
          <Grid item xs={3} sm={4} style={{ color: '#00e676', textAlign: 'center' }}>
            {isMobile
              ? <Check />
              : <Typography>{t('enable_all')}</Typography>}
          </Grid>
          <Grid item xs={9} sm={8}>
            <Typography variant="subtitle2" align="center">
              {t('tutorial_check')}
            </Typography>
          </Grid>
          <Grid item xs={3} sm={4} style={{ textAlign: 'center' }}>
            {isMobile
              ? <Save color="secondary" />
              : <Typography color="secondary">{t('save')}</Typography>}
          </Grid>
          <Grid item xs={9} sm={8}>
            <Typography variant="subtitle2" align="center">
              {t('tutorial_save')}
            </Typography>
          </Grid>
          {toggleHelp ? (
            <Grid item xs={12} style={{ textAlign: 'right' }}>
              <Button onClick={toggleHelp} color="secondary" size="small">
                {t('close')}
              </Button>
            </Grid>
          ) : (
            <Grid item xs={12} style={{ textAlign: 'center' }}>
              <Button onClick={handleSwitch} variant="contained" color="primary" size="small">
                {isPokemon ? t('tutorial_show_all_view') : t('tutorial_show_pokemon_view')}
              </Button>
            </Grid>
          )}
        </Grid>
      </DialogContent>
    </>
  )
}

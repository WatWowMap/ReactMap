/* eslint-disable no-restricted-syntax */
import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  Grid,
  useMediaQuery,
} from '@material-ui/core'
import { useTheme } from '@material-ui/core/styles'
import masterfile from '../../../../data/masterfile.json'
import defaultRarity from '../../../../data/defaultRarity.json'

import useStyles from '../../../../assets/mui/styling'
import AdvancedMenu from './AdvancedFilter'
import Tile from './PokemonTile'
import FilterOptions from '../components/FilterOptions'
import FilterFooter from '../components/FilterFooter'

export default function PokemonMenu({
  settings, globalFilters, toggleDialog, availableForms,
}) {
  const classes = useStyles()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('xs'))

  const [filterDrawer, setFilterDrawer] = useState(false)
  const [tempFilters, setTempFilters] = useState(globalFilters.pokemon.filter)
  const [advancedFilter, setAdvancedFilter] = useState({
    open: false,
    id: 0,
    formId: 0,
    filters: {},
  })
  const [filters, setFilters] = useState({
    generations: {
      Kanto: true,
      Johto: false,
      Hoenn: false,
      Sinnoh: false,
      Unova: false,
      Kalos: false,
      Alola: false,
      Galar: false,
    },
    types: {
      Normal: false,
      Fire: false,
      Water: false,
      Grass: false,
      Electric: false,
      Ice: false,
      Fighting: false,
      Poison: false,
      Ground: false,
      Flying: false,
      Psychic: false,
      Bug: false,
      Rock: false,
      Ghost: false,
      Dark: false,
      Dragon: false,
      Steel: false,
      Fairy: false,
    },
    rarities: {
      Common: false,
      Uncommon: false,
      Rare: false,
      UltraRare: false,
      Regional: false,
      Event: false,
      Legendary: false,
      Mythical: false,
    },
    others: {
      AllForms: false,
    },
  })
  const [expanded, setExpanded] = useState('generations')

  const handleAccordion = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false)
  }

  const selectAllOrNone = (show) => {
    Object.values(filteredPokesObj).forEach(pokemon => {
      pokemon.enabled = show
    })
    setTempFilters({ ...tempFilters, ...filteredPokesObj })
  }

  const handleChange = (name, event) => {
    setFilters({ ...filters, [name]: { ...filters[name], [event.target.name]: event.target.checked } })
  }

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    setFilterDrawer(open)
  }

  const toggleAdvMenu = (open, id, newFilters) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    if (open) {
      setAdvancedFilter({ open, id, tempFilters: tempFilters[id] })
    } else {
      setAdvancedFilter({ open })
      setTempFilters({ ...tempFilters, [id]: newFilters })
    }
  }

  const filteredPokes = []
  const filteredPokesObj = {}
  for (const [i, pkmn] of Object.entries(masterfile.pokemon)) {
    const forms = Object.keys(pkmn.forms)
    for (let j = 0; j < forms.length; j += 1) {
      const formId = forms[j]
      const id = `${i}-${formId}`
      let formName = pkmn.forms[formId].name || ''
      pkmn.types = pkmn.types ? pkmn.types : []
      const skipForms = ['shadow', 'purified']

      if (!skipForms.includes(formName.toLowerCase())) {
        formName = formName === 'Normal' ? '' : `(${formName})`

        for (const [tier, pokemon] of Object.entries(defaultRarity)) {
          if (pokemon.includes(parseInt(i))) {
            pkmn.rarity = tier
          }
        }

        if (filters.generations[pkmn.generation]
          || filters.types[pkmn.types[0]]
          || filters.types[pkmn.types[1]]
          || filters.rarities[pkmn.rarity]
          || (filters.rarities.Legendary && pkmn.legendary)
          || (filters.rarities.Mythical && pkmn.mythic)) {
          if (!filters.others.AllForms) {
            if (formId == pkmn.default_form_id || formName === '()') {
              filteredPokes.push({ id, i, formId })
              filteredPokesObj[id] = { ...tempFilters[id] }
            }
          } else {
            filteredPokes.push({ id, i, formId })
            filteredPokesObj[id] = { ...tempFilters[id] }
          }
        }
      }
    }
  }

  const allPokemon = filteredPokes.map(pokemon => (
    <Tile
      key={pokemon.id}
      pokemon={pokemon}
      settings={settings}
      availableForms={availableForms}
      tempFilters={tempFilters}
      setTempFilters={setTempFilters}
      toggleAdvMenu={toggleAdvMenu}
    />
  ))

  const allFilterMenus = Object.entries(filters).map(filter => (
    <FilterOptions
      key={filter[0]}
      name={filter[0]}
      options={filter[1]}
      handleChange={handleChange}
      expanded={expanded}
      handleAccordion={handleAccordion}
    />
  ))

  return (
    <>
      {!advancedFilter.open
        ? (
          <>
            <DialogTitle
              className={classes.filterHeader}
            >
              Pokemon Filter Settings
            </DialogTitle>
            <DialogContent>
              <Grid
                container
                direction="row"
                justify="space-evenly"
                alignItems="flex-start"
              >
                {!isMobile && (
                  <Grid
                    container
                    item
                    sm={4}
                    md={3}
                    spacing={2}
                    direction="column"
                    justify="flex-start"
                    alignItems="flex-start"
                  >
                    {allFilterMenus}
                  </Grid>
                )}
                <Grid
                  container
                  item
                  xs={12}
                  sm={8}
                  md={9}
                  spacing={2}
                  direction="row"
                  justify="space-evenly"
                  alignItems="flex-start"
                >
                  {allPokemon}
                </Grid>
              </Grid>
            </DialogContent>
            <FilterFooter
              selectAllOrNone={selectAllOrNone}
              toggleDialog={toggleDialog}
              tempFilters={tempFilters}
              toggleDrawer={toggleDrawer}
            />
            <Drawer
              anchor="left"
              open={filterDrawer}
              onClose={toggleDrawer(false)}
            >
              {allFilterMenus}
            </Drawer>
          </>
        )
        : (
          <Dialog
            fullWidth
            maxWidth="sm"
            open={advancedFilter.open}
            aria-labelledby="max-width-dialog-title"
          >
            {advancedFilter.open && (
              <AdvancedMenu
                advancedFilter={advancedFilter}
                toggleAdvMenu={toggleAdvMenu}
              />
            )}
          </Dialog>
        )}
    </>
  )
}

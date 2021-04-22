import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  Grid,
  useMediaQuery,
  TextField,
} from '@material-ui/core'
import { FixedSizeGrid } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import { useTheme } from '@material-ui/core/styles'
import Utility from '../../../../services/Utility'

import { useStore, useMasterfile } from '../../../../hooks/useStore'
import useStyles from '../../../../assets/mui/styling'
import AdvancedMenu from './AdvancedFilter'
import Tile from './PokemonTile'
import FilterOptions from '../components/FilterOptions'
import FilterFooter from '../components/FilterFooter'

export default function PokemonMenu({ globalFilters, toggleDialog }) {
  const classes = useStyles()
  const theme = useTheme()
  const url = useStore(state => state.settings).iconStyle.path
  const availableForms = useMasterfile(state => state.availableForms)

  let columnCount = useMediaQuery(theme.breakpoints.up('md')) ? 5 : 3
  const isMobile = useMediaQuery(theme.breakpoints.down('xs'))
  if (isMobile) columnCount = 2

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
      Johto: true,
      Hoenn: true,
      Sinnoh: true,
      Unova: true,
      Kalos: true,
      Alola: true,
      Galar: true,
    },
    types: {
      Bug: false,
      Dark: false,
      Dragon: false,
      Electric: false,
      Fairy: false,
      Fighting: false,
      Fire: false,
      Flying: false,
      Ghost: false,
      Grass: false,
      Ground: false,
      Ice: false,
      Normal: false,
      Poison: false,
      Psychic: false,
      Rock: false,
      Steel: false,
      Water: false,
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
      allForms: false,
      selected: false,
      advanced: false,
    },
  })
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState('generations')

  const { filteredPokesObj, filteredPokes } = Utility.filterPokemon(tempFilters, filters, search)

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

  const handleSearchChange = event => {
    setSearch(event.target.value.toString().toLowerCase())
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
  allFilterMenus.push(
    <Grid item key="search">
      <TextField
        className={classes.formControl}
        id="search"
        label="Search"
        name="search"
        value={search}
        onChange={handleSearchChange}
        variant="outlined"
      />
    </Grid>,
  )
  // eslint-disable-next-line no-nested-ternary
  const vHeight = expanded === 'types' ? '131vh' : expanded === 'generations' || expanded === 'rarities' ? '80vh' : '75vh'

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
                  item
                  xs={12}
                  sm={8}
                  md={9}
                  style={{ height: vHeight }}
                >
                  <AutoSizer defaultHeight={1080} defaultWidth={1920}>
                    {({ width, height }) => (
                      <FixedSizeGrid
                        className="grid"
                        width={width}
                        height={height}
                        columnCount={columnCount}
                        columnWidth={width / columnCount - 5}
                        rowCount={Math.ceil(filteredPokes.length / columnCount)}
                        rowHeight={140}
                        itemData={{
                          pkmn: filteredPokes,
                          columnCount,
                          tempFilters,
                          setTempFilters,
                          toggleAdvMenu,
                          url,
                          availableForms,
                        }}
                      >
                        {Tile}
                      </FixedSizeGrid>
                    )}
                  </AutoSizer>
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

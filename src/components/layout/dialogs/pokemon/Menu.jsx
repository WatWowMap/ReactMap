import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  Grid,
  useMediaQuery,
  TextField,
  Button,
} from '@material-ui/core'
import { FixedSizeGrid } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import { useTheme } from '@material-ui/core/styles'
import Utility from '../../../../services/Utility'

import { useStore, useMasterfile } from '../../../../hooks/useStore'
import useStyles from '../../../../assets/mui/styling'
import AdvancedMenu from './AdvancedFilter'
import Tile from './MenuTile'
import FilterOptions from '../components/FilterOptions'
import FilterFooter from '../components/FilterFooter'

export default function Menu({ globalFilters, toggleDialog }) {
  const classes = useStyles()
  const theme = useTheme()
  const url = useStore(state => state.settings).iconStyle.path
  const availableForms = useMasterfile(state => state.availableForms)
  const menus = useStore(state => state.menus)
  const setMenus = useStore(state => state.setMenus)

  let columnCount = useMediaQuery(theme.breakpoints.up('md')) ? 5 : 3
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  if (isMobile) columnCount = 2

  const [filterDrawer, setFilterDrawer] = useState(false)
  const [tempFilters, setTempFilters] = useState(globalFilters.pokemon.filter)
  const [advancedFilter, setAdvancedFilter] = useState({
    open: false,
  })
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(false)

  const { filteredPokesObj, filteredPokes } = Utility.filterPokemon(tempFilters, menus.pokemon, search)

  const handleAccordion = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false)
  }

  const selectAllOrNone = (show) => {
    Object.values(filteredPokesObj).forEach(pkmn => {
      pkmn.enabled = show
    })
    setTempFilters({ ...tempFilters, ...filteredPokesObj })
  }

  const handleChange = (name, event) => {
    setMenus({
      ...menus,
      pokemon: {
        ...menus.pokemon,
        [name]: {
          ...menus.pokemon[name],
          [event.target.name]: event.target.checked,
        },
      },
    })
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
    } else if (id === 'ivAnd') {
      setAdvancedFilter({ open })
      Object.entries(filteredPokesObj).forEach(poke => {
        const [key, { enabled }] = poke
        filteredPokesObj[key] = { ...newFilters, enabled }
      })
      setTempFilters({ ...tempFilters, ...filteredPokesObj, [id]: newFilters })
    } else {
      setAdvancedFilter({ open })
      setTempFilters({ ...tempFilters, [id]: newFilters })
    }
  }

  const handleReset = () => {
    const resetPayload = {}
    Object.keys(menus.pokemon).forEach(category => {
      resetPayload[category] = {}
      Object.keys(menus.pokemon[category]).forEach(filter => {
        resetPayload[category][filter] = false
      })
    })
    setMenus({ ...menus, pokemon: resetPayload })
  }

  const allFilterMenus = Object.entries(menus.pokemon).map(filter => {
    const [category, options] = filter
    return (
      <FilterOptions
        key={category}
        name={category}
        options={options}
        handleChange={handleChange}
        expanded={expanded}
        handleAccordion={handleAccordion}
      />
    )
  })
  allFilterMenus.push(
    <Grid item key="search">
      <TextField
        className={classes.search}
        color="secondary"
        id="search"
        label="Search"
        name="search"
        value={search}
        onChange={handleSearchChange}
        variant="outlined"
      />
    </Grid>,
    <Grid item key="reset">
      <Button onClick={toggleAdvMenu(true, 'ivAnd')} color="secondary">
        Set Filter for <br />
        All Selected
      </Button>
    </Grid>,
    <Grid item key="global">
      <Button onClick={handleReset} color="primary">
        Reset Filters
      </Button>
    </Grid>,
  )

  return (
    <>
      {advancedFilter.open
        ? (
          <Dialog
            fullWidth
            maxWidth="sm"
            open={advancedFilter.open}
            onClose={toggleAdvMenu(false)}
          >
            <AdvancedMenu
              advancedFilter={advancedFilter}
              toggleAdvMenu={toggleAdvMenu}
            />
          </Dialog>
        )
        : (
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
                  style={{ height: '74vh' }}
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
        )}
    </>
  )
}

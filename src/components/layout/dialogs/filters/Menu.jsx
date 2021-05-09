import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  Grid,
  Button,
  Paper,
  InputBase,
  IconButton,
} from '@material-ui/core'
import { HighlightOff } from '@material-ui/icons'
import { FixedSizeGrid } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import Utility from '../../../../services/Utility'

import { useStore, useMasterfile } from '../../../../hooks/useStore'
import useStyles from '../../../../hooks/useStyles'
import Advanced from './Advanced'
import Tile from './MenuTile'
import FilterOptions from './Options'
import Footer from './Footer'

export default function Menu({ filters, toggleDialog, type }) {
  const classes = useStyles()
  const menus = useStore(state => state.menus)
  const setMenus = useStore(state => state.setMenus)
  const breakpoint = useMasterfile(state => state.breakpoint)
  const { text } = useMasterfile(state => state.ui)

  let columnCount = breakpoint === 'sm' ? 3 : 5
  if (breakpoint === 'xs') columnCount = 1
  const isMobile = breakpoint === 'xs'

  const [filterDrawer, setFilterDrawer] = useState(false)
  const [tempFilters, setTempFilters] = useState(filters.filter)
  const [advancedFilter, setAdvancedFilter] = useState({
    open: false,
    id: '',
    tempFilters: {},
    default: filters.standard,
  })
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(false)

  const { filteredObj, filteredArr } = Utility[type](tempFilters, menus[type], search)

  const handleAccordion = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false)
  }

  const selectAllOrNone = (show) => {
    Object.values(filteredObj).forEach(pkmn => {
      pkmn.enabled = show
    })
    setTempFilters({ ...tempFilters, ...filteredObj })
  }

  const handleChange = (name, event) => {
    setMenus({
      ...menus,
      [type]: {
        ...menus[type],
        [name]: {
          ...menus[type][name],
          [event.target.name]: event.target.checked,
        },
      },
    })
  }

  const handleSearchChange = event => {
    setSearch(event.target.value.toString().toLowerCase())
  }

  const resetSearch = () => {
    setSearch('')
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
      setAdvancedFilter({
        open,
        id,
        tempFilters: tempFilters[id],
        standard: filters.standard,
      })
    } else if (id === 'ivAnd') {
      setAdvancedFilter({ open })
      Object.entries(filteredObj).forEach(poke => {
        const [key, { enabled }] = poke
        filteredObj[key] = { ...newFilters, enabled }
      })
      setTempFilters({ ...tempFilters, ...filteredObj, [id]: newFilters })
    } else {
      setAdvancedFilter({ open })
      setTempFilters({ ...tempFilters, [id]: newFilters })
    }
  }

  const handleReset = () => {
    const resetPayload = {}
    Object.keys(menus[type]).forEach(category => {
      resetPayload[category] = {}
      Object.keys(menus[type][category]).forEach(filter => {
        resetPayload[category][filter] = false
      })
    })
    setMenus({ ...menus, [type]: resetPayload })
  }

  const allFilterMenus = Object.entries(menus[type]).map(filter => {
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
    <Grid item key="reset">
      <Button onClick={handleReset} color="primary">
        {text.resetFilters}
      </Button>
    </Grid>,
  )

  return (
    <>
      <Dialog
        fullWidth
        open={advancedFilter.open}
        onClose={toggleAdvMenu(false)}
      >
        <Advanced
          advancedFilter={advancedFilter}
          toggleAdvMenu={toggleAdvMenu}
          type={type}
          legacy={filters.legacy}
        />
      </Dialog>
      <DialogTitle className={classes.filterHeader}>
        {Utility.getProperName(type)} {text.filterSettings}
      </DialogTitle>
      <DialogContent>
        <Grid
          container
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
          <Grid item xs={12} sm={8} md={9}>
            <Paper elevation={0} variant="outlined" className={classes.search}>
              <InputBase
                className={classes.input}
                placeholder={`Filter ${Utility.getProperName(type)}`}
                name="search"
                value={search}
                onChange={handleSearchChange}
                fullWidth
                autoComplete="off"
                variant="outlined"
              />
              <IconButton
                className={classes.iconButton}
                onClick={resetSearch}
              >
                <HighlightOff style={{ color: '#848484' }} />
              </IconButton>
            </Paper>
            <div style={{ height: isMobile ? '64vh' : '73vh' }}>
              <AutoSizer defaultHeight={1080} defaultWidth={1920}>
                {({ width, height }) => (
                  <FixedSizeGrid
                    className="grid"
                    width={width}
                    height={height}
                    columnCount={columnCount}
                    columnWidth={width / columnCount - 5}
                    rowCount={Math.ceil(filteredArr.length / columnCount)}
                    rowHeight={columnCount > 1 ? 120 : 60}
                    itemData={{
                      tileItem: filteredArr,
                      isMobile,
                      columnCount,
                      tempFilters,
                      setTempFilters,
                      toggleAdvMenu,
                      type,
                    }}
                  >
                    {Tile}
                  </FixedSizeGrid>
                )}
              </AutoSizer>
            </div>
          </Grid>
        </Grid>
      </DialogContent>
      <Footer
        selectAllOrNone={selectAllOrNone}
        toggleDialog={toggleDialog}
        tempFilters={tempFilters}
        toggleDrawer={toggleDrawer}
        isMobile={isMobile}
        toggleAdvMenu={toggleAdvMenu}
        handleReset={handleReset}
        type={type}
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
}

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
  Typography,
} from '@material-ui/core'
import { HighlightOff, Clear } from '@material-ui/icons'
import { FixedSizeGrid } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'

import Utility from '@services/Utility'
import { useStore, useStatic } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'
import Advanced from './Advanced'
import Tile from './MenuTile'
import FilterOptions from './Options'
import Footer from './Footer'
import SlotSelection from './SlotSelection'

export default function Menu({ filters, toggleDialog, type }) {
  const classes = useStyles()
  const menus = useStore(state => state.menus)
  const setMenus = useStore(state => state.setMenus)
  const breakpoint = useStatic(state => state.breakpoint)
  const { text } = useStatic(state => state.ui)
  const { [type]: staticFilters } = useStatic(state => state.staticMenus)

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
  const [slotsMenu, setSlotsMenu] = useState({
    open: false,
    id: 0,
  })
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(type === 'pokemon' ? 'others' : 'categories')

  const { filteredObj, filteredArr, count } = Utility.menuFilter(tempFilters, menus, search, type)

  const handleAccordion = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false)
  }

  const selectAllOrNone = (show) => {
    Object.values(filteredObj).forEach(item => {
      item.enabled = show
    })
    setTempFilters({ ...tempFilters, ...filteredObj })
  }

  const handleChange = (name, event) => {
    setMenus({
      ...menus,
      [type]: {
        ...menus[type],
        filters: {
          ...menus[type].filters,
          [name]: {
            ...menus[type].filters[name],
            [event.target.name]: event.target.checked,
          },
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
    } else if (id === 'global') {
      setAdvancedFilter({ open })
      Object.entries(filteredObj).forEach(item => {
        const [key, { enabled }] = item
        filteredObj[key] = { ...newFilters, enabled }

        // ugly patch for also changing gym slots with the apply to all
        if (key.startsWith('t') && key.charAt(1) != 0) {
          for (let i = 1; i <= 6; i += 1) {
            const slotKey = `g${key.charAt(1)}-${i}`
            filteredObj[slotKey] = { ...newFilters, enabled: tempFilters[slotKey].enabled }
          }
        }
      })
      setTempFilters({ ...tempFilters, ...filteredObj, [id]: newFilters })
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

  const handleReset = () => {
    const resetPayload = {}
    Object.keys(menus[type].filters).forEach(category => {
      resetPayload[category] = {}
      Object.keys(menus[type].filters[category]).forEach(filter => {
        resetPayload[category][filter] = false
      })
    })
    setMenus({ ...menus, [type]: { ...menus[type], filters: resetPayload } })
  }

  const allFilterMenus = Object.entries(staticFilters.filters).map(filter => {
    const [category, options] = filter
    if (Object.keys(options).length > 1) {
      return (
        <FilterOptions
          key={category}
          name={category}
          options={options}
          userSelection={menus[type].filters[category]}
          handleChange={handleChange}
          expanded={expanded}
          handleAccordion={handleAccordion}
        />
      )
    }
    return null
  })
  allFilterMenus.push(
    <Grid item key="reset">
      <Button onClick={handleReset} color="primary">
        {text.resetFilters}
      </Button>
    </Grid>,
    <Grid item key="count" style={{ textAlign: 'center' }}>
      <Typography variant="h6" align="center">Showing:</Typography>
      <Typography variant="subtitle2" align="center">{count.show}/{count.total}</Typography>
    </Grid>,
  )

  return (
    <>
      <Dialog
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
      <DialogTitle className={classes.filterHeader}>
        {Utility.getProperName(type)} {text.filterSettings}
        <IconButton
          onClick={toggleDialog(false, type, filters.filter)}
          style={{ position: 'absolute', right: 5, top: 5 }}
        >
          <Clear />
        </IconButton>
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
              sm={3}
              spacing={1}
              direction="column"
              justify="flex-start"
              alignItems="flex-start"
            >
              {allFilterMenus}
            </Grid>
          )}
          <Grid item xs={12} sm={9}>
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
            <div style={{ minHeight: isMobile ? '54vh' : '60vh' }}>
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
                      toggleSlotsMenu,
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
        setTempFilters={setTempFilters}
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

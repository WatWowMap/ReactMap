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
  useMediaQuery,
} from '@material-ui/core'
import { HighlightOff, Clear } from '@material-ui/icons'
import { FixedSizeGrid } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@material-ui/styles'

import Utility from '@services/Utility'
import { useStore, useStatic } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'
import Advanced from './Advanced'
import Tile from './MenuTile'
import FilterOptions from './Options'
import Footer from './Footer'
import SlotSelection from './SlotSelection'

export default function Menu({ filters, toggleDialog, category }) {
  Utility.analytics(`/advanced/${category}`)

  const classes = useStyles()
  const theme = useTheme()
  const menus = useStore(state => state.menus)
  const setMenus = useStore(state => state.setMenus)
  const advMenu = useStore(state => state.advMenu)
  const setAdvMenu = useStore(state => state.setAdvMenu)
  const { [category]: staticMenus } = useStatic(state => state.menus)
  const { t } = useTranslation()

  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  let columnCount = window.matchMedia('(max-width: 960px)') ? 5 : 3
  if (isMobile) columnCount = 1

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

  const { filteredObj, filteredArr, count } = Utility.menuFilter(tempFilters, menus, search, category)

  const handleAccordion = (panel) => (event, isExpanded) => {
    setAdvMenu({
      ...advMenu,
      [category]: isExpanded ? panel : false,
    })
  }

  const generateSlots = (teamId, show) => {
    for (let i = 1; i <= 6; i += 1) {
      const slotKey = `g${teamId.charAt(1)}-${i}`
      filteredObj[slotKey] = typeof show === 'boolean'
        ? { ...tempFilters[slotKey], enabled: show }
        : show
    }
  }

  const selectAllOrNone = (show) => {
    Object.entries(filteredObj).forEach(([key, item]) => {
      item.enabled = show
      if (key.startsWith('t') && key.charAt(1) != 0) {
        generateSlots(key, show)
      }
    })
    setTempFilters({ ...tempFilters, ...filteredObj })
  }

  const handleChange = (name, event) => {
    Utility.analytics('Filtering Options', `New Value: ${event.target.checked}`, `Category: ${category} Name: ${name}.${event.target.name}`)
    setMenus({
      ...menus,
      [category]: {
        ...menus[category],
        filters: {
          ...menus[category].filters,
          [name]: {
            ...menus[category].filters[name],
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
          generateSlots(key, newFilters)
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
    Object.keys(menus[category].filters).forEach(cat => {
      resetPayload[cat] = {}
      Object.keys(menus[category].filters[cat]).forEach(filter => {
        resetPayload[cat][filter] = false
      })
    })
    setMenus({ ...menus, [category]: { ...menus[category], filters: resetPayload } })
  }

  const allFilterMenus = Object.entries(staticMenus.filters).map(filter => {
    const [cat, options] = filter
    if (Object.keys(options).length > 1) {
      return (
        <FilterOptions
          key={cat}
          name={cat}
          options={options}
          userSelection={menus[category].filters[cat]}
          handleChange={handleChange}
          expanded={advMenu[category]}
          handleAccordion={handleAccordion}
        />
      )
    }
    return null
  })
  allFilterMenus.push(
    <Grid item key="reset">
      <Button onClick={handleReset} color="primary">
        {t('resetFilters')}
      </Button>
    </Grid>,
    <Grid item key="count" style={{ textAlign: 'center' }}>
      <Typography variant="h6" align="center">{t('showing')}:</Typography>
      <Typography variant="subtitle2" align="center">{count.show}/{count.total}</Typography>
    </Grid>,
  )

  if (menus[category].filters.others.onlyAvailable) {
    allFilterMenus.push(
      <Grid item key="onlyAvailable">
        <Typography variant="caption" align="center">{t('onlyShowingAvailable')}</Typography>
      </Grid>,
    )
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
        {t(`${category}Filters`)}
        <IconButton
          onClick={toggleDialog(false, category, 'filters', filters.filter)}
          style={{ position: 'absolute', right: 5, top: 5 }}
        >
          <Clear style={{ color: 'white' }} />
        </IconButton>
      </DialogTitle>
      <DialogContent className="no-scroll">
        <Grid
          container
          justifyContent="space-evenly"
          alignItems="flex-start"
        >
          {!isMobile && (
            <Grid
              container
              item
              sm={3}
              spacing={1}
              direction="column"
              justifyContent="flex-start"
              alignItems="flex-start"
            >
              {allFilterMenus}
            </Grid>
          )}
          <Grid item xs={12} sm={9}>
            <Paper elevation={0} variant="outlined" className={classes.search}>
              <InputBase
                className={classes.input}
                placeholder={t(`search${category}`)}
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
                      type: category,
                      Utility,
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
        type={category}
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

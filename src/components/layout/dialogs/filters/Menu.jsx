import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  Drawer,
  Grid,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import { useStore } from '@hooks/useStore'

import ReactWindow from '@components/layout/general/ReactWindow'
import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'
import Advanced from './Advanced'
import Tile from './MenuTile'
import SlotSelection from './SlotSelection'
import OptionsContainer from './OptionsContainer'
import Help from '../tutorial/Advanced'

export default function Menu({
  filters, toggleDialog, category, isTablet, isMobile, webhook = false, WebhookTile,
}) {
  Utility.analytics(`/advanced/${category}`)

  const menus = useStore(state => state.menus)
  const setMenus = useStore(state => state.setMenus)
  const advMenu = useStore(state => state.advMenu)
  const setAdvMenu = useStore(state => state.setAdvMenu)

  const { t } = useTranslation()

  let columnCount = isTablet ? 3 : 5
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
  const [helpDialog, setHelpDialog] = useState(false)

  const { filteredObj, filteredArr, count } = Utility.menuFilter(tempFilters, menus, search, category)

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

  const Options = (
    <OptionsContainer
      count={count}
      category={category}
      Utility={Utility}
      handleReset={handleReset}
      advMenu={advMenu}
      setAdvMenu={setAdvMenu}
      search={search}
      setSearch={setSearch}
      menus={menus}
      setMenus={setMenus}
    />
  )

  const footerButtons = [
    { name: 'help', action: () => setHelpDialog(!helpDialog), icon: 'HelpOutline', color: 'white' },
    { name: 'openFilter', action: toggleDrawer(true), icon: 'Ballot', color: 'white', mobileOnly: true },
    { name: 'applyToAll', action: toggleAdvMenu(true, 'global'), icon: category === 'pokemon' ? 'Tune' : 'FormatSize', color: 'white' },
    { name: 'disableAll', action: () => selectAllOrNone(false), icon: 'Clear', color: 'primary' },
    { name: 'enableAll', action: () => selectAllOrNone(true), icon: 'Check', color: '#00e676' },
    { name: 'save', action: webhook ? toggleDialog : toggleDialog(false, category, 'filters', tempFilters), icon: 'Save', color: 'secondary' },
  ]
  return (
    <>
      <Header
        title={t(`${category}Filters`)}
        action={webhook ? toggleDialog : toggleDialog(false, category, 'filters', filters.filter)}
      />
      <DialogContent style={{ padding: '8px 5px', height: '100%' }}>
        <Grid container spacing={1}>
          {isMobile ? (
            <Grid item style={{ height: '85vh', overflow: 'auto' }} />
          ) : (
            <Grid item sm={3} style={{ height: '75vh', overflow: 'auto' }}>
              {Options}
            </Grid>
          )}
          <ReactWindow
            columnCount={columnCount}
            length={filteredArr.length}
            flex
            offset={0}
            data={{
              isMobile,
              tileItem: filteredArr,
              tempFilters,
              setTempFilters,
              toggleAdvMenu,
              toggleSlotsMenu,
              type: category,
              Utility,
            }}
            Tile={WebhookTile || Tile}
          />
        </Grid>
      </DialogContent>
      <Footer options={footerButtons} role="dialogFilterFooter" />
      <Drawer
        anchor="bottom"
        open={filterDrawer}
        onClose={toggleDrawer(false)}
      >
        {Options}
      </Drawer>
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
      <Dialog
        open={helpDialog}
      >
        <Help
          toggleHelp={() => setHelpDialog(!helpDialog)}
          category={category}
          isMobile={isMobile}
        />
      </Dialog>
    </>
  )
}

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  Drawer,
  Grid,
} from '@material-ui/core'

import Utility from '@services/Utility'
import { useStore } from '@hooks/useStore'
import useFilter from '@hooks/useFilter'

import ReactWindow from '@components/layout/general/ReactWindow'
import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'
import Advanced from '../dialogs/filters/Advanced'
import SlotSelection from '../dialogs/filters/SlotSelection'
import OptionsContainer from '../dialogs/filters/OptionsContainer'
import Help from '../dialogs/tutorial/Advanced'
import WebhookAdvanced from '../dialogs/webhooks/WebhookAdv'
import AdvSearch from '../dialogs/filters/AdvSearch'

export default function Menu({
  isTablet, isMobile, category, Tile, webhookCategory,
  filters, tempFilters, setTempFilters, categories,
  title, titleAction, extraButtons = [],
}) {
  Utility.analytics(`/advanced/${category}`)

  const menus = useStore(state => state.menus)
  const setMenus = useStore(state => state.setMenus)
  const advMenu = useStore(state => state.advMenu)
  const setAdvMenu = useStore(state => state.setAdvMenu)

  let columnCount = isTablet ? 3 : 5
  if (isMobile) columnCount = 1

  const [filterDrawer, setFilterDrawer] = useState(false)
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
  const [webhook, setWebhook] = useState({
    open: false,
    id: '',
  })

  const { filteredObj, filteredArr, count } = useFilter(
    tempFilters, menus, search, category, webhookCategory, categories,
  )

  const selectAllOrNone = (show) => {
    const newObj = {}
    Object.entries(filteredObj).forEach(([key, item]) => {
      newObj[key] = { ...item, enabled: show }
      if (key.startsWith('t') && key.charAt(1) != 0 && !webhookCategory) {
        Object.assign(newObj, Utility.generateSlots(key, show, tempFilters))
      }
    })
    setTempFilters({ ...tempFilters, ...newObj })
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
      const newObj = tempFilters
      Object.entries(filteredObj).forEach(item => {
        const [key, { enabled }] = item
        newObj[key] = { ...newFilters, enabled }

        // ugly patch for also changing gym slots with the apply to all
        if (key.startsWith('t') && key.charAt(1) != 0) {
          Object.assign(newObj, Utility.generateSlots(key, newFilters, tempFilters))
        }
      })
      setTempFilters({ ...tempFilters, ...newObj, [id]: newFilters })
    } else {
      setAdvancedFilter({ open })
      setTempFilters({ ...tempFilters, [id]: newFilters })
    }
  }

  const toggleWebhook = (open, id, newFilters) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    if (id === 'global' && !open && newFilters) {
      const wildCards = (() => {
        switch (webhookCategory) {
          case 'raid': return ['r90']
          case 'egg': return ['e90']
          case 'gym': return ['t4']
          case 'invasion': return ['i0']
          default: return ['0-0']
        }
      })()
      if (newFilters.everything_individually !== false) {
        Object.keys(filteredObj).forEach(item => {
          if (!wildCards.includes(item)) {
            filteredObj[item] = { ...tempFilters[item], ...newFilters, enabled: true }
          }
        })
      } else {
        wildCards.forEach(item => {
          filteredObj[item] = { ...tempFilters[item], ...newFilters, enabled: true }
        })
      }
      setTempFilters({ ...tempFilters, ...filteredObj, [id]: newFilters })
    } else if (id && newFilters && !open) {
      setTempFilters({ ...tempFilters, [id]: { ...tempFilters[id], ...newFilters, enabled: true } })
    }
    setWebhook({ open, id })
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
      toggleDrawer={toggleDrawer}
      isMobile={isMobile}
      categories={categories}
    />
  )

  const footerButtons = [
    { name: 'help', action: () => setHelpDialog(!helpDialog), icon: 'HelpOutline', color: 'white' },
    { name: 'openFilter', action: toggleDrawer(true), icon: 'Ballot', color: 'white', mobileOnly: true },
    { name: 'apply_to_all', action: webhookCategory ? toggleWebhook(true, 'global') : toggleAdvMenu(true, 'global'), icon: category === 'pokemon' || webhookCategory ? 'Tune' : 'FormatSize', color: 'white' },
    { name: 'disable_all', action: () => selectAllOrNone(false), icon: 'Clear', color: 'primary' },
    { name: 'enable_all', action: () => selectAllOrNone(true), icon: 'Check', color: '#00e676' },
    ...extraButtons,
  ]

  return (
    <>
      <Header
        titles={[title]}
        action={titleAction}
        names={[webhookCategory || category]}
      />
      <DialogContent style={{ padding: '8px 5px', height: '100%' }}>
        <Grid container spacing={1}>
          {!isMobile && (
            <Grid item sm={3} style={{ height: '75vh', overflow: 'auto' }}>
              {Options}
            </Grid>
          )}
          <Grid container item xs={12} sm={9} direction="column" style={isMobile ? { height: '85vh' } : {}}>
            <AdvSearch
              search={search}
              setSearch={setSearch}
              category={category}
            />
            <div style={{ flex: '1 1 auto' }}>
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
                  toggleWebhook,
                  webhookCategory,
                }}
                Tile={Tile}
              />
            </div>
          </Grid>
        </Grid>
      </DialogContent>
      <Footer options={footerButtons} role="dialog_filter_footer" />
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
        fullScreen={isMobile && category === 'pokemon'}
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
          isMobile={isMobile}
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
      <Dialog
        open={webhook.open}
        fullWidth={!isMobile}
        fullScreen={isMobile}
      >
        <WebhookAdvanced
          id={webhook.id}
          category={webhookCategory}
          isMobile={isMobile}
          toggleWebhook={toggleWebhook}
          tempFilters={tempFilters[webhook.id]}
        />
      </Dialog>
    </>
  )
}

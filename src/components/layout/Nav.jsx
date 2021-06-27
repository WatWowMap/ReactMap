import React, { useState } from 'react'
import Dialog from '@material-ui/core/Dialog'

import { useStatic, useStore } from '@hooks/useStore'
import FloatingBtn from './FloatingBtn'
import Sidebar from './drawer/Drawer'
import FilterMenu from './dialogs/filters/Menu'
import UserOptions from './dialogs/UserOptions'
import UserProfile from './dialogs/UserProfile'
import Tutorial from './dialogs/tutorial/Tutorial'
import UserPerms from './dialogs/UserPerms'

export default function Nav() {
  const filters = useStore(state => state.filters)
  const setFilters = useStore(state => state.setFilters)
  const userSettings = useStore(state => state.userSettings)
  const setUserSettings = useStore(state => state.setUserSettings)
  const tutorial = useStore(state => state.tutorial)
  const setTutorial = useStore(state => state.setTutorial)
  const forcedTutorialDisplayed = useStore(state => state.forcedTutorialDisplayed)
  const setForcedTutorialDisplayed = useStore(state => state.setForcedTutorialDisplayed)
  const { map: { forceTutorial, enableTutorial, enableUserPerms } } = useStatic(state => state.config)
  const [drawer, setDrawer] = useState(false)
  const [dialog, setDialog] = useState({
    open: false,
    category: '',
    type: '',
  })
  const [userProfile, setUserProfile] = useState(false)
  const [userPerms, setUserPerms] = useState(false)

  if (forceTutorial && !forcedTutorialDisplayed) {
    setTutorial(true)
    setForcedTutorialDisplayed(true)
  }

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    setDrawer(open)
  }

  const toggleDialog = (open, category, type, filter) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    if (open) {
      setDialog({ open, category, type })
    } else {
      setDialog({ open, category, type })
    }
    if (filter && type === 'filters') {
      setFilters({ ...filters, [category]: { ...filters[category], filter } })
    }
    if (filter && type === 'options') {
      setUserSettings({ ...userSettings, [category]: filter })
    }
  }

  return (
    <>
      {drawer ? (
        <Sidebar
          drawer={drawer}
          toggleDrawer={toggleDrawer}
          filters={filters}
          setFilters={setFilters}
          toggleDialog={toggleDialog}
        />
      ) : (
        <FloatingBtn
          toggleDrawer={toggleDrawer}
          setUserProfile={setUserProfile}
        />
      )}
      <Dialog
        fullWidth
        maxWidth="md"
        open={dialog.open && dialog.type === 'filters'}
        onClose={toggleDialog(false, dialog.category, dialog.type)}
      >
        <FilterMenu
          toggleDialog={toggleDialog}
          filters={filters[dialog.category]}
          category={dialog.category}
        />
      </Dialog>
      <Dialog
        maxWidth="sm"
        open={dialog.open && dialog.type === 'options'}
        onClose={toggleDialog(false, dialog.category, dialog.type)}
      >
        <UserOptions
          toggleDialog={toggleDialog}
          category={dialog.category}
        />
      </Dialog>
      {enableUserPerms && (
        <Dialog open={userPerms} fullWidth>
          <UserPerms setUserPerms={setUserPerms} />
        </Dialog>
      )}
      {enableTutorial && (
        <Dialog open={tutorial}>
          <Tutorial setUserPerms={setUserPerms} setTutorial={setTutorial} toggleDialog={toggleDialog} />
        </Dialog>
      )}
      <Dialog
        open={userProfile}
        onClose={() => setUserProfile(false)}
        fullWidth
        maxWidth="xs"
      >
        <UserProfile setUserProfile={setUserProfile} />
      </Dialog>
    </>
  )
}

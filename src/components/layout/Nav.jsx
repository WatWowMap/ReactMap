import React, { useState } from 'react'
import Dialog from '@material-ui/core/Dialog'

import { useStore } from '@hooks/useStore'
import FloatingBtn from './FloatingBtn'
import Sidebar from './drawer/Drawer'
import FilterMenu from './dialogs/filters/Menu'
import UserOptions from './dialogs/UserOptions'
import Tutorial from './dialogs/tutorial/Tutorial'
import UserProfile from './dialogs/UserProfile'

export default function Nav() {
  const filters = useStore(state => state.filters)
  const setFilters = useStore(state => state.setFilters)
  const userSettings = useStore(state => state.userSettings)
  const setUserSettings = useStore(state => state.setUserSettings)
  const tutorial = useStore(state => state.tutorial)
  const setTutorial = useStore(state => state.setTutorial)
  const [drawer, setDrawer] = useState(false)
  const [dialog, setDialog] = useState({
    open: false,
    category: '',
    type: '',
  })
  const [userProfile, setUserProfile] = useState(false)

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
      {userProfile ? (
        <Dialog open={userProfile} fullWidth>
          <UserProfile setUserProfile={setUserProfile} />
        </Dialog>
      ) : (
        <Dialog
          open={tutorial}
        >
          <Tutorial setUserProfile={setUserProfile} setTutorial={setTutorial} toggleDialog={toggleDialog} />
        </Dialog>
      )}
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
    </>
  )
}

import React, { useState } from 'react'
import Dialog from '@material-ui/core/Dialog'

import { useStore } from '../../hooks/useStore'
import FloatingBtn from './FloatingBtn'
import Drawer from './drawer/Drawer'
import Menu from './dialogs/filters/Menu'

export default function Nav() {
  const filters = useStore(state => state.filters)
  const setFilters = useStore(state => state.setFilters)
  const [drawer, setDrawer] = useState(false)
  const [dialog, setDialog] = useState({
    open: false,
    type: '',
  })

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    setDrawer(open)
  }

  const toggleDialog = (open, type, filter) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    if (open) {
      setDialog({ open, type })
    } else {
      setDialog({ open, type })
    }
    if (filter) setFilters({ ...filters, [type]: { ...filters[type], filter } })
  }

  return (
    <>
      {drawer ? (
        <Drawer
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
        open={dialog.open}
        onClose={toggleDialog(false, dialog.type)}
      >
        <Menu
          toggleDialog={toggleDialog}
          filters={filters[dialog.type]}
          type={dialog.type}
        />
      </Dialog>
    </>
  )
}

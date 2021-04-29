import React, { useState } from 'react'
import Dialog from '@material-ui/core/Dialog'

import { useStore } from '../../hooks/useStore'
import FloatingBtn from './FloatingBtn'
import Drawer from './drawer/Main'
import * as Dialogs from './dialogs/dialogIndex'

export default function Nav() {
  const filters = useStore(state => state.filters)
  const setFilters = useStore(state => state.setFilters)
  const [drawer, setDrawer] = useState(true)
  const [dialog, setDialog] = useState({
    open: false,
    category: '',
    type: '',
  })

  console.log('hi')

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    setDrawer(open)
  }

  const toggleDialog = (open, type, filter, category) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    if (open) {
      setDialog({ open, category, type })
    } else {
      setDialog({ open, category: '', type: '' })
      setFilters({ ...filters, [type]: { ...filters[type], filter } })
    }
  }

  const DialogToRender = (category, type) => {
    const DialogMenu = Dialogs[category]
    return (
      <DialogMenu
        toggleDialog={toggleDialog}
        filters={filters}
        type={type}
      />
    )
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
        onClose={toggleDialog(false)}
      >
        {dialog.open && DialogToRender(dialog.category, dialog.type)}
      </Dialog>
    </>
  )
}

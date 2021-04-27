import React, { useState } from 'react'
import Dialog from '@material-ui/core/Dialog'

import { useStore } from '../../hooks/useStore'
import FloatingBtn from './FloatingBtn'
import Drawer from './Drawer'
import * as Dialogs from './dialogs/dialogIndex'

export default function Nav() {
  const globalFilters = useStore(state => state.filters)
  const setGlobalFilters = useStore(state => state.setFilters)
  const [drawer, setDrawer] = useState(false)
  const [dialog, setDialog] = useState({
    open: false,
    category: '',
    type: '',
  })

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
      setGlobalFilters({ ...globalFilters, [type]: { ...globalFilters[type], filter } })
    }
  }

  const DialogToRender = (category, type) => {
    const DialogMenu = Dialogs[category]
    console.log(category, type)
    return (
      <DialogMenu
        toggleDialog={toggleDialog}
        globalFilters={globalFilters}
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
          globalFilters={globalFilters}
          setGlobalFilters={setGlobalFilters}
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

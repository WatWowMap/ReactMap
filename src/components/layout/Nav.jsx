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
    name: 'none',
  })

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    setDrawer(open)
  }

  const toggleDialog = (open, type, filters) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    if (open) {
      setDialog({ open, name: type })
    } else {
      setDialog({ open })
      setGlobalFilters({ ...globalFilters, [type]: { ...globalFilters[type], filter: filters } })
    }
  }

  const DialogToRender = (name) => {
    const DialogMenu = Dialogs[name]
    return (
      <DialogMenu
        toggleDialog={toggleDialog}
        globalFilters={globalFilters}
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
        {dialog.open && DialogToRender(dialog.name)}
      </Dialog>
    </>
  )
}

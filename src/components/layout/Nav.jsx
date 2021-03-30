import React, { useState } from 'react'
import Dialog from '@material-ui/core/Dialog'

import FloatingBtn from './FloatingBtn'
import Drawer from './Drawer'
import * as Dialogs from './dialogs/index'

export default function Nav({
  config, settings, setSettings, globalFilters, setGlobalFilters, availableForms, map, defaultFilters, masterfile,
}) {
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
        config={config}
        settings={settings}
        setSettings={setSettings}
        toggleDialog={toggleDialog}
        availableForms={availableForms}
        globalFilters={globalFilters}
        setGlobalFilters={setGlobalFilters}
        defaultFilters={defaultFilters}
        masterfile={masterfile}
      />
    )
  }

  return (
    <>
      {!drawer ? (
        <FloatingBtn
          map={map}
          toggleDrawer={toggleDrawer}
        />
      ) : (
        <Drawer
          drawer={drawer}
          toggleDrawer={toggleDrawer}
          globalFilters={globalFilters}
          setGlobalFilters={setGlobalFilters}
          toggleDialog={toggleDialog}
        />
      )}
      <Dialog
        fullWidth
        maxWidth="md"
        open={dialog.open}
        onClose={toggleDialog(false, 'none')}
      >
        {dialog.open && DialogToRender(dialog.name)}
      </Dialog>
    </>
  )
}

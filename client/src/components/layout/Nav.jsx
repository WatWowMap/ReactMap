import React, { useState } from 'react'
import FloatingBtn from './FloatingBtn.jsx'
import Drawer from './Drawer.jsx'
import Dialog from '@material-ui/core/Dialog'
import * as Dialogs from './dialogs/index.js'

const Nav = ({ config, settings, setSettings, globalFilters, setGlobalFilters, availableForms, map }) => {
  const [drawer, setDrawer] = useState(false)
  const [dialog, setDialog] = useState({
    open: false,
    name: 'none'
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
    if ( open ) {
      setDialog({ open, name: type })
    } else {
      setDialog({ open })
      setGlobalFilters({ ...globalFilters, [type]: { ...globalFilters[type], filter: filters} })
    }
  }

  const DialogToRender = (name) => {
    const DialogToRender = Dialogs[name]
    return (
      <DialogToRender
        config={config}
        settings={settings}
        setSettings={setSettings}
        toggleDialog={toggleDialog}
        availableForms={availableForms}
        globalFilters={globalFilters}
        setGlobalFilters={setGlobalFilters} />
    )
  }

  return (
    <>
      {!drawer ? <FloatingBtn
        map={map}
        toggleDrawer={toggleDrawer}
      /> :
        <Drawer
          drawer={drawer}
          toggleDrawer={toggleDrawer}
          globalFilters={globalFilters}
          setGlobalFilters={setGlobalFilters}
          toggleDialog={toggleDialog}
        />}
      <Dialog
        fullWidth={true}
        maxWidth='md'
        open={dialog.open}
        onClose={toggleDialog(false, 'none')}
      >
        {dialog.open && DialogToRender(dialog.name)}
      </Dialog>
    </>
  )
}

export default Nav
import React, { useState } from 'react'
import FloatingBtn from './FloatingBtn.jsx'
import Drawer from './Drawer.jsx'
import Dialog from '@material-ui/core/Dialog'
import * as Dialogs from './dialogs/index.js'

const Nav = ({ config, settings, setSettings, selected, setSelected }) => {
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

  const toggleDialog = (open, type) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    setDialog({ open: open, name: type })
  }

  const DialogToRender = (name) => {
    const DialogToRender = Dialogs[name]
    return (
      <DialogToRender
        config={config}
        settings={settings}
        setSettings={setSettings}
        toggleDialog={toggleDialog} />
    )
  }

  return (
    <>
      {!drawer ? <FloatingBtn
        toggleDrawer={toggleDrawer}
      /> :
        <Drawer
          drawer={drawer}
          toggleDrawer={toggleDrawer}
          selected={selected}
          setSelected={setSelected}
          toggleDialog={toggleDialog}
        />}
      <Dialog
        fullWidth={true}
        maxWidth='sm'
        open={dialog.open}
        onClose={toggleDialog(false, 'none')}
        aria-labelledby="max-width-dialog-title"
      >
        {dialog.open && DialogToRender(dialog.name)}
      </Dialog>
    </>
  )
}

export default Nav
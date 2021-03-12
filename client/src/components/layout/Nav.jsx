import React, { useState } from 'react'
import FloatingBtn from './FloatingBtn.jsx'
import Drawer from './Drawer.jsx'

const Nav = ({ selected, setSelected }) => {
  const [drawer, setDrawer] = useState({
    left: false
  })

  const toggleDrawer = (anchor, open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    setDrawer({ [anchor]: open })
  }

  return (
    <>
      {!drawer.left && <FloatingBtn
        toggleDrawer={toggleDrawer}
      />
      }
      <Drawer
        drawer={drawer}
        toggleDrawer={toggleDrawer}
        selected={selected}
        setSelected={setSelected}
      />
    </>
  )
}

export default Nav
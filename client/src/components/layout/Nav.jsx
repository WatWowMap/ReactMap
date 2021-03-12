import React, { useState } from 'react'
import FloatingBtn from './FloatingBtn.jsx'
import Drawer from './Drawer.jsx'

const Nav = ({ selected, setSelected }) => {
  const [drawer, setDrawer] = useState(false)

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    setDrawer(open)
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
        />}
    </>
  )
}

export default Nav
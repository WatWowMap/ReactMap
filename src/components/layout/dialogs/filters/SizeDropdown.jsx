import React, { useState } from 'react'
import { Menu, MenuItem, IconButton } from '@material-ui/core'

export default function SizeDropdown({ tempFilters, setTempFilters, itemId }) {
  const [anchorEl, setAnchorEl] = useState(false)
  const options = ['sm', 'md', 'lg', 'xl']
  const open = Boolean(anchorEl)

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleSetSize = (option) => {
    setAnchorEl(null)
    setTempFilters({ ...tempFilters, [itemId]: { ...tempFilters[itemId], size: option } })
  }

  return (
    <>
      <IconButton
        onClick={handleClick}
        color="secondary"
        size="small"
      >
        {tempFilters[itemId].size}
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={open}
        onClose={handleClose}
        PaperProps={{
          style: {
            maxHeight: 216,
            width: '20ch',
          },
        }}
      >
        {options.map((option) => (
          <MenuItem
            key={option}
            selected={tempFilters[itemId].size === option}
            onClick={() => handleSetSize(option)}
          >
            {option}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

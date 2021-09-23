import React from 'react'
import { Menu, MenuItem } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function Dropdown({ options, anchorEl, handleClose }) {
  const { t } = useTranslation()
  return (
    <Menu
      anchorEl={anchorEl}
      keepMounted
      open={Boolean(anchorEl)}
      onClose={handleClose}
      PaperProps={{
        style: {
          maxHeight: 216,
          width: '20ch',
        },
      }}
    >
      {options.map((option) => (
        <MenuItem key={option.name} onClick={option.action}>
          {t(option.name)}
        </MenuItem>
      ))}
    </Menu>
  )
}

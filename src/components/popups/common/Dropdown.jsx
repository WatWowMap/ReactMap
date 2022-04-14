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
          minWidth: 20,
          margin: '10px 0px',
        },
      }}
    >
      {options.map((option) => (
        <MenuItem key={option.key || option.name} onClick={option.action} dense>
          {typeof option.name === 'string' ? t(option.name) : option.name}
        </MenuItem>
      ))}
    </Menu>
  )
}

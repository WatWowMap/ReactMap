// @ts-check
import * as React from 'react'
import IconButton from '@mui/material/IconButton'
import useTheme from '@mui/material/styles/useTheme'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { useStorage } from '@hooks/useStorage'

const handleClick = () =>
  useStorage.setState((prev) => ({ darkMode: !prev.darkMode }))

export default function ThemeToggle() {
  const theme = useTheme()

  return (
    <IconButton onClick={handleClick} color="inherit">
      {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
    </IconButton>
  )
}

import * as React from 'react'
import IconButton from '@mui/material/IconButton'
import useTheme from '@mui/material/styles/useTheme'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import { useStore } from '@hooks/useStore'

export default function ThemeToggle() {
  const theme = useTheme()

  return (
    <IconButton
      onClick={() =>
        useStore.setState({ darkMode: theme.palette.mode !== 'dark' })
      }
      color="inherit"
    >
      {theme.palette.mode === 'dark' ? (
        <Brightness7Icon />
      ) : (
        <Brightness4Icon />
      )}
    </IconButton>
  )
}

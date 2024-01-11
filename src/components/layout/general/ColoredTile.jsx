import { styled } from '@mui/material/styles'
import Box from '@mui/material/Box'

export const ColoredTile = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  position: 'absolute',
  top: 0,
  left: 0,
  opacity: 0.5,
  transition: theme.transitions.create('opacity', {
    duration: theme.transitions.duration.shortest,
  }),
  '&:hover': {
    opacity: 0.75,
  },
}))

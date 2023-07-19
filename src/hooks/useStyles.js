import { makeStyles } from '@mui/styles'

export default makeStyles((theme) => {
  const darkMode = theme.palette.mode === 'dark'
  return {
    '@global': {
      '*::-webkit-scrollbar': {
        width: '5px',
      },
      '*::-webkit-scrollbar-track': {
        backgroundColor: darkMode
          ? theme.palette.grey[900]
          : theme.palette.grey[50],
      },
      '*::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.action.selected,
        borderRadius: '3px',
      },
      '*::-webkit-scrollbar-thumb:hover': {
        backgroundColor: theme.palette.action.selected,
      },
    },
  }
})

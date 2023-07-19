import { makeStyles } from '@mui/styles'
import { purple } from '@mui/material/colors'

export default makeStyles((theme) => {
  const darkMode = theme.palette.mode === 'dark'
  return {
    gridItem: {
      height: 75,
      width: 'auto',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'contain',
    },
    formLabel: {
      color: 'white',
    },
    filterHeader: {
      color: '#fff',
      backgroundColor: theme.palette.secondary.main,
    },
    successButton: {
      color: theme.palette.success.main,
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      margin: 'auto',
      width: 'fit-content',
    },
    formControlLabel: {
      marginTop: theme.spacing(1),
    },
    accordionSummary: {
      backgroundColor: '#2e2e2e',
    },
    list: {
      width: 'auto',
      zIndex: 9998,
      color: '#FFFFFF',
      backgroundColor: 'rgb(51,51,51)',
    },
    drawer: {
      background: 'rgb(51,51,51)',
    },
    login: {
      display: 'flex',
      margin: '45% auto auto auto',
      backgroundColor: 'rgb(52, 52, 52)',
    },
    expand: {
      transform: 'rotate(0deg)',
    },
    expandOpen: {
      transform: 'rotate(180deg)',
    },
    scrollPaper: {
      alignItems: 'baseline',
    },
    container: {
      height: false,
    },
    avatar: {
      backgroundColor: `${theme.palette.secondary.main} !important`,
      color: 'white !important',
    },
    quickAddCheckbox: {
      fontSize: '12px !important',
    },
    modifyWebhook: {
      color: theme.palette.getContrastText(purple[500]),
      backgroundColor: `${purple[500]} !important`,
      '&:hover': {
        backgroundColor: `${purple[700]} !important`,
      },
    },
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
    areaChips: {
      display: 'flex',
      justifyContent: 'center',
      flexWrap: 'wrap',
      '& > *': {
        margin: theme.spacing(1),
      },
    },
  }
})

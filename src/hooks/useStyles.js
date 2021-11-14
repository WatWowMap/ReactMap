import { makeStyles } from '@material-ui/styles'
import { purple } from '@material-ui/core/colors'

export default makeStyles(theme => ({
  gridItem: {
    height: 75,
    width: 'auto',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'contain',
  },
  formControl: {
    width: 125,
    color: 'white',
  },
  formLabel: {
    color: 'white',
  },
  filterHeader: {
    color: '#fff',
    backgroundColor: theme.palette.secondary.main,
  },
  filterFooter: {
    backgroundColor: '#424242',
    textAlign: 'center',
    height: 50,
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
  list: {
    width: 'auto',
    zIndex: 9998,
    color: '#FFFFFF',
    backgroundColor: 'rgb(51,51,51)',
  },
  drawer: {
    background: 'rgb(51,51,51)',
    overflow: 'hidden',
  },
  floatingBtn: {
    '& > *': {
      margin: `${theme.spacing(1)}px !important`,
      position: 'sticky',
      top: 0,
      left: 5,
      zIndex: 1000,
      width: 10,
    },
  },
  login: {
    display: 'flex',
    margin: '45% auto auto auto',
    backgroundColor: 'rgb(52, 52, 52)',
  },
  search: {
    padding: '2px 4px',
    display: 'flex',
    alignItems: 'center',
    margin: 3,
  },
  input: {
    marginLeft: theme.spacing(1),
    flex: 1,
  },
  iconButton: {
    padding: 10,
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
      backgroundColor: theme.palette.grey[900],
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
}))

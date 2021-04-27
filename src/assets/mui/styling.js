import { makeStyles } from '@material-ui/styles'
import theme from './theme'

export default makeStyles({
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
  sliderInput: {
    maxWidth: 75,
  },
  formLabel: {
    color: 'white',
  },
  filterHeader: {
    color: '#fff',
    backgroundColor: theme.palette.secondary.main,
  },
  filterFooter: {
    backgroundColor: theme.palette.grey.dark,
    textAlign: 'center',
  },
  slider: {
    width: 200,
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
  formControlSettings: {
    marginTop: theme.spacing(2),
    minWidth: 120,
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
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    flexBasis: '33.33%',
    flexShrink: 0,
  },
  floatingBtn: {
    '& > *': {
      margin: theme.spacing(1),
      position: 'sticky',
      top: 0,
      left: 5,
      zIndex: 9998,
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
    height: 50,
  },
  input: {
    marginLeft: theme.spacing(1),
    flex: 1,
  },
  iconButton: {
    padding: 10,
  },
})

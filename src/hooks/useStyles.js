import { makeStyles } from '@material-ui/styles'

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
    backgroundColor: theme.palette.grey.dark,
    textAlign: 'center',
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
      margin: theme.spacing(1),
      position: 'sticky',
      top: 0,
      left: 5,
      zIndex: 9998,
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
    height: 50,
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
    marginLeft: 'auto',
    transition: theme.transitions.create('transform', {
      duration: theme.transitions.duration.shortest,
    }),
  },
  expandOpen: {
    transform: 'rotate(180deg)',
  },
}))

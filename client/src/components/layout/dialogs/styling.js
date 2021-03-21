import { makeStyles } from '@material-ui/styles'
import theme from '../theme.js'

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
  formLabel: {
    color: 'white'
  },
  filterHeader: {
    color: '#fff',
    backgroundColor: theme.palette.secondary.main
  },
  filterFooter: {
    backgroundColor: theme.palette.grey.dark,
    textAlign: 'center'
  },
  slider: {
    width: 200
  },
  successButton: {
    color: theme.palette.success.main
  }
})
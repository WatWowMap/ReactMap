import { createMuiTheme, responsiveFontSizes } from '@material-ui/core'

const theme = responsiveFontSizes(createMuiTheme({
  palette: {
    primary: {
      light: '#ff784e',
      main: '#ff5722',
      dark: '#b23c17',
      contrastText: '#fff',
    },
    secondary: {
      light: '#33bfff',
      main: '#00b0ff',
      dark: '#007bb2',
      contrastText: '#fff',
    },
    grey: {
      light: '#bdbdbd',
      main: '#333333',
      dark: '#424242',
      contrastText: '#fff',
    },
    background: {
      paper: '#333333',
      default: '#333333',
    },
    success: {
      main: '#00e676',
    },
    text: {
      primary: '#f5f5f5',
      secondary: 'white',
      hint: '#a0a0a0',
    },
  },
}))

export default theme

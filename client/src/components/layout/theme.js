import { createMuiTheme, responsiveFontSizes } from '@material-ui/core'

let theme = createMuiTheme({
  palette: {
    primary: {
      light: '#ED1A7A',
      main: '#2196f3',
      dark: '#ED1A7A',
      contrastText: '#fff',
    },
    secondary: {
      light: '#49AEB9',
      main: '#ff9100',
      dark: '#49AEB9',
      contrastText: '#fff',
    }
  }
})
theme = responsiveFontSizes(theme)

export default theme
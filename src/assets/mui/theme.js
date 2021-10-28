import { responsiveFontSizes } from '@material-ui/core'
import { createTheme } from '@material-ui/core/styles'

export default function setTheme(theme) {
  return responsiveFontSizes(createTheme({
    palette: {
      type: 'dark',
      primary: {
        light: '#ff784e',
        main: theme.primary,
        dark: '#b23c17',
        contrastText: '#fff',
      },
      secondary: {
        light: '#33bfff',
        main: theme.secondary,
        dark: '#007bb2',
        contrastText: '#fff',
      },
      action: {
        main: '#00e676',
        contrastText: '#fff',
        active: '#00e676',
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
      text: {
        primary: '#f5f5f5',
        secondary: 'white',
        hint: '#a0a0a0',
      },
    },
    props: {
      MuiButtonBase: {
        disableRipple: true,
      },
    },
    overrides: {
      MuiAccordion: {
        root: {
          '&$expanded': {
            margin: '1px 0',
          },
        },
      },
      MuiAccordionSummary: {
        root: {
          '&$expanded': {
            minHeight: 10,
          },
        },
        content: {
          '&$expanded': {
            margin: '10px 0',
          },
        },
      },
      MuiSvgIcon: {
        root: {
          color: 'white',
        },
      },
      MuiSelect: {
        icon: {
          color: 'white',
        },
        iconOpen: {
          color: 'white',
        },
      },
    },
  }))
}

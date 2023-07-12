import { responsiveFontSizes } from '@mui/material'
import { createTheme } from '@mui/material/styles'

export default function setTheme(theme) {
  return responsiveFontSizes(
    createTheme({
      palette: {
        mode: 'dark',
        primary: {
          light: '#ff784e',
          main: theme?.primary || '#ff5722',
          dark: '#b23c17',
          contrastText: '#fff',
        },
        secondary: {
          light: '#33bfff',
          main: theme?.secondary || '#00b0ff',
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
      components: {
        MuiButtonBase: {
          defaultProps: {
            disableRipple: true,
          },
        },
        MuiButton: {
          defaultProps: {
            disableRipple: true,
          },
        },
        MuiAccordion: {
          styleOverrides: {
            root: {
              '.&expanded': {
                margin: '1px 0',
              },
            },
          },
        },
        MuiAccordionSummary: {
          styleOverrides: {
            root: {
              '.&expanded': {
                minHeight: 10,
              },
            },
            content: {
              '.&expanded': {
                margin: '10px 0',
              },
            },
          },
        },
        MuiSelect: {
          styleOverrides: {
            icon: {
              color: 'white',
            },
            iconOpen: {
              color: 'white',
            },
          },
        },
        MuiDialogTitle: {
          styleOverrides: {
            root: {
              padding: '12px 24px',
            },
          },
        },
      },
      // overrides: {
      //   MuiDialogTitle: {
      //     root: {
      //       padding: '12px 24px',
      //     },
      //   },
      // MuiAccordion: {
      //   root: {
      //     '&$expanded': {
      //       margin: '1px 0',
      //     },
      //   },
      // },
      // MuiAccordionSummary: {
      //   root: {
      //     '&$expanded': {
      //       minHeight: 10,
      //     },
      //   },
      //   content: {
      //     '&$expanded': {
      //       margin: '10px 0',
      //     },
      //   },
      // },
      //   MuiSelect: {
      //     icon: {
      //       color: 'white',
      //     },
      //     iconOpen: {
      //       color: 'white',
      //     },
      //   },
      // },
    }),
  )
}

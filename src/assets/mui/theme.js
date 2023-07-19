// @ts-check
import { responsiveFontSizes } from '@mui/material'
import { createTheme } from '@mui/material/styles'
import * as locales from '@mui/material/locale'

/**
 * @param {{ primary?: string, secondary?: string }} theme
 * @param {boolean} darkMode
 * @param {keyof typeof locales} locale
 * @returns
 */
export default function customTheme(
  theme = {},
  darkMode = true,
  locale = 'enUS',
) {
  return responsiveFontSizes(
    createTheme(
      {
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            main: theme?.primary || '#ff5722',
          },
          secondary: {
            main: theme?.secondary || '#00b0ff',
          },
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
          MuiAccordion: {
            defaultProps: {
              disableGutters: true,
            },
          },
          MuiAutocomplete: {
            styleOverrides: {
              inputRoot: {
                paddingRight: `0px !important`,
              },
            },
          },
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
          MuiDialogContent: {
            styleOverrides: {
              root: {
                height: '100%',
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
        //   MuiSelect: {
        //     icon: {
        //       color: 'white',
        //     },
        //     iconOpen: {
        //       color: 'white',
        //     },
        //   },
        // },
      },
      locales[locale],
    ),
  )
}

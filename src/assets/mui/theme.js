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
  darkMode = document.body.classList.contains('dark'),
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
          MuiTabs: {
            defaultProps: {
              textColor: 'inherit',
              indicatorColor: 'secondary',
              variant: 'fullWidth',
            },
            styleOverrides: {
              root: ({ theme: t }) => ({
                backgroundColor:
                  t.palette.grey[t.palette.mode === 'dark' ? 800 : 500],
                width: '100%',
              }),
            },
          },
          MuiAccordion: {
            defaultProps: {
              disableGutters: true,
            },
          },
          MuiSelect: {
            defaultProps: {
              size: 'small',
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
          MuiSlider: {
            defaultProps: {
              size: 'small',
              valueLabelDisplay: 'auto',
            },
          },
        },
      },
      locales[locale],
    ),
  )
}

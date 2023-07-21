// @ts-check
import { responsiveFontSizes } from '@mui/material'
import { createTheme, darken } from '@mui/material/styles'
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
            contrastText: '#fff',
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: (t) => ({
              // Global

              body: {
                backgroundColor: t.palette.background.paper,
              },
              '*': {
                scrollbarWidth: 'thin',
              },
              '*::-webkit-scrollbar': {
                width: '5px',
              },
              '*::-webkit-scrollbar-track': {
                backgroundColor: t.palette.grey[darkMode ? 900 : 50],
              },
              '*::-webkit-scrollbar-thumb': {
                backgroundColor: t.palette.action.selected,
                borderRadius: '3px',
              },
              '*::-webkit-scrollbar-thumb:hover': {
                backgroundColor: t.palette.action.selected,
              },
              '*::-webkit-scrollbar-thumb:active': {
                backgroundColor: t.palette.action.selected,
              },

              // Leaflet

              '.leaflet-tooltip': {
                backgroundColor: t.palette.background.paper,
                border: `${t.palette.divider} solid 1px`,
                color: t.palette.text.primary,
              },
              '.leaflet-tooltip-bottom:before': {
                borderBottomColor: t.palette.background.paper,
              },
              '.leaflet-tooltip-top:before': {
                borderBottomColor: t.palette.background.paper,
              },
              '.leaflet-popup-tip-container .leaflet-popup-tip': {
                backgroundColor: t.palette.background.paper,
              },
              '.leaflet-popup-content-wrapper': {
                backgroundColor: t.palette.background.paper,
                border: `${t.palette.divider} solid 4px`,
                color: t.palette.text.primary,
              },
              '.leaflet-bar a': {
                backgroundColor: t.palette.grey[darkMode ? 900 : 50],
                borderBottom: `1px solid ${t.palette.divider}`,
                color: t.palette.text.primary,
                transition: t.transitions.create(['background-color'], {
                  duration: t.transitions.duration.standard,
                  easing: t.transitions.easing.easeInOut,
                }),
              },
              '.leaflet-bar a:active, .leaflet-bar a:focus, .leaflet-bar a:hover':
                {
                  backgroundColor: darken(
                    t.palette.grey[darkMode ? 800 : 50],
                    darkMode ? 0.2 : 0.1,
                  ),
                },
              '.leaflet-touch .leaflet-control-zoom-in, .leaflet-touch .leaflet-control-zoom-out':
                {
                  lineHeight: '25px !important',
                },
              [t.breakpoints.down('sm')]: {
                '.leaflet-touch .leaflet-control-zoom-in, .leaflet-touch .leaflet-control-zoom-out':
                  {
                    lineHeight: '30px !important',
                  },
              },
              '.leaflet-bar a.leaflet-disabled': {
                backgroundColor: darken(
                  t.palette.grey[darkMode ? 900 : 50],
                  0.3,
                ),
              },

              // Other

              '.ar-task': {
                border: `2px solid ${t.palette.divider}`,
                borderRadius: '12px',
                padding: '3px',
                fontSize: '0.5rem !important',
                backgroundColor: t.palette.grey[darkMode ? 900 : 50],
                color: t.palette.text.primary,
              },
              '.iv-badge': {
                backgroundColor: t.palette.grey[darkMode ? 900 : 50],
                color: t.palette.text.primary,
                border: `2px solid ${t.palette.divider}`,
              },
              '.disabled-overlay': {
                backgroundColor: t.palette.grey[darkMode ? 900 : 50],
              },
            }),
          },
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
                backgroundColor: t.palette.grey[darkMode ? 800 : 500],
                width: '100%',
              }),
            },
          },
          MuiAccordion: {
            defaultProps: {
              disableGutters: true,
            },
            styleOverrides: {
              root: {
                '&.Mui-expanded:before': {
                  opacity: 1,
                },
              },
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
              paper: {
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
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

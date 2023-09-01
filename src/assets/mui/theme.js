// @ts-check
import { createTheme, responsiveFontSizes, darken } from '@mui/material/styles'
import dlv from 'dlv'

const VALID_COLOR =
  /^#([A-Fa-f0-9]{3,4}){1,2}$|^rgb\((\s*\d{1,3}\s*,){2}\s*\d{1,3}\s*\)$|^rgba\((\s*\d{1,3}\s*,){3}\s*(0?\.\d+|1\.0|1|\d{1,2}%)\s*\)$|^hsl\(\s*\d{1,3}(\s*,\s*\d{1,3}%){2}\s*\)$|^hsla\(\s*\d{1,3}(\s*,\s*\d{1,3}%){2}\s*,\s*(0?\.\d+|1\.0|1|\d{1,2}%)\s*\)$/

/** @type {import('@mui/material').Components<Omit<import('@mui/material').Theme, 'components'>>} */
const components = {
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },
  MuiStack: {
    defaultProps: {
      direction: 'column',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      sx: (t) => ({
        width: { xs: 50, sm: 65 },
        zIndex: 5000,
        '& > *': {
          margin: `${t.spacing(1)} !important`,
          position: 'sticky',
          top: 0,
          left: 5,
          zIndex: 1000,
          width: 10,
        },
      }),
    },
  },
  MuiListSubheader: {
    defaultProps: {
      disableSticky: true,
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
        backgroundColor: t.palette.grey[t.palette.mode === 'dark' ? 800 : 500],
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
    styleOverrides: {
      root: ({ theme, ownerState }) => {
        const color = ownerState?.bgcolor
        if (typeof color === 'string') {
          const backgroundColor = color
            ? (typeof color === 'string' && color.includes('.')) ||
              color in theme.palette
              ? dlv(theme.palette, color)
              : color
            : theme.palette.success.dark
          const finalColor =
            typeof backgroundColor === 'string'
              ? backgroundColor
              : backgroundColor?.main
          if (!VALID_COLOR.test(finalColor) || !finalColor) {
            return
          }
          return {
            color: theme.palette.getContrastText(finalColor),
            backgroundColor,
            '&:hover': {
              backgroundColor: darken(finalColor, 0.2),
            },
          }
        }
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
  MuiSlider: {
    defaultProps: {
      size: 'small',
      valueLabelDisplay: 'auto',
    },
  },
}

const DEFAULT_PALETTE = {
  primary: '#ff5722',
  secondary: '#00b0ff',
}

/**
 * @param {{ primary?: string, secondary?: string }} themeOptions
 * @param {boolean} darkMode
 * @returns
 */
export default function customTheme(
  themeOptions = DEFAULT_PALETTE,
  darkMode = document.body.classList.contains('dark'),
) {
  const newTheme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: themeOptions.primary,
      },
      secondary: {
        main: themeOptions.secondary,
        contrastText: '#fff',
      },
      discord: {
        main: '#5865F2',
        green: '#57F287',
        yellow: '#FEE75C',
        fuchsia: '#EB459E',
        red: '#ED4245',
      },
    },
    components,
  })
  return responsiveFontSizes(newTheme)
}

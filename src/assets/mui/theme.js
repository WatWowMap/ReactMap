// @ts-check
import { createTheme, responsiveFontSizes } from '@mui/material/styles'

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
    },
    components,
  })
  return responsiveFontSizes(newTheme)
}

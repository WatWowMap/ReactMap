// @ts-check
import { useStatic, useStore } from '@hooks/useStore'
import { createTheme, responsiveFontSizes, darken } from '@mui/material/styles'
import dlv from 'dlv'
import { useMemo } from 'react'

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

/**
 * @returns {import('@mui/material').Theme}
 */
export default function useCustomTheme() {
  const primary = useStatic((s) => s.theme.primary)
  const secondary = useStatic((s) => s.theme.secondary)
  const darkMode = useStore((s) => s.darkMode)

  if (darkMode) {
    if (!document.body.classList.contains('dark')) {
      document.body.classList.add('dark')
    }
  } else if (document.body.classList.contains('dark')) {
    document.body.classList.remove('dark')
  }

  const newTheme = useMemo(
    () =>
      responsiveFontSizes(
        createTheme({
          palette: {
            mode: darkMode ? 'dark' : 'light',
            primary: {
              main: primary,
            },
            secondary: {
              main: secondary,
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
        }),
      ),
    [darkMode, primary, secondary],
  )
  return newTheme
}

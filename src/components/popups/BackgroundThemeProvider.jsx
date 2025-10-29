// @ts-check
import * as React from 'react'
import ThemeProvider from '@mui/material/styles/ThemeProvider'
import { createTheme, useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'

const BackgroundStylesContext = React.createContext({
  hasBackground: false,
  visuals: undefined,
})

/**
 * Accessor for background styling context.
 * @returns {{
 *  hasBackground: boolean
 *  visuals?: any
 * }}
 */
export function useBackgroundStyles() {
  return React.useContext(BackgroundStylesContext)
}

/**
 * Wraps popup content with a dark theme override when a background image is present.
 *
 * @param {{
 *  visuals?: {
 *    hasBackground?: boolean
 *    primaryColor?: string
 *    secondaryColor?: string
 *    borderColor?: string
 *    primaryTextShadow?: string
 *    secondaryTextShadow?: string
 *    styles?: {
 *      surface?: import('react').CSSProperties
 *      icon?: import('react').CSSProperties
 *    }
 *  }
 *  children: React.ReactNode
 * }} props
 */
export function BackgroundThemeProvider({ visuals, children }) {
  const parentTheme = useTheme()
  const {
    hasBackground,
    primaryColor,
    borderColor,
    primaryTextShadow,
    styles = {},
  } = visuals || {}

  const surfaceStyle = hasBackground
    ? {
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
        alignSelf: 'stretch',
        margin: '-13px -20px',
        padding: '13px 20px',
        width: 'calc(100% + 40px)',
        maxWidth: 'none',
        boxSizing: 'border-box',
        ...(styles.surface || {}),
      }
    : {}
  const iconStyles = hasBackground
    ? { color: primaryColor || '#fff', ...(styles.icon || {}) }
    : {}

  const paletteOverrides = React.useMemo(() => {
    if (!hasBackground) {
      return {}
    }
    const overrides = {}
    Object.entries(parentTheme.palette || {}).forEach(([key, value]) => {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        'main' in value &&
        typeof value.main === 'string'
      ) {
        overrides[key] = {
          ...value,
          main:
            typeof value.light === 'string' && value.light
              ? value.light
              : value.main,
          contrastText:
            typeof value.contrastText === 'string' && value.contrastText
              ? value.contrastText
              : '#fff',
        }
      }
    })
    return overrides
  }, [hasBackground, parentTheme.palette])

  const contextValue = React.useMemo(
    () => ({
      hasBackground: Boolean(hasBackground),
      visuals,
    }),
    [hasBackground, visuals],
  )

  const themed = React.useMemo(() => {
    if (!hasBackground) {
      return parentTheme
    }
    return createTheme(parentTheme, {
      palette: {
        mode: 'dark',
        ...paletteOverrides,
      },
    })
  }, [borderColor, hasBackground, paletteOverrides, parentTheme, primaryColor])

  if (!hasBackground) {
    return (
      <BackgroundStylesContext.Provider value={contextValue}>
        {children}
      </BackgroundStylesContext.Provider>
    )
  }

  return (
    <ThemeProvider theme={themed}>
      <BackgroundStylesContext.Provider value={contextValue}>
        <Box
          sx={{
            ...surfaceStyle,
            color: primaryColor || parentTheme.palette.text.primary,
            '& .MuiTypography-root': {
              textShadow: primaryTextShadow || 'none',
            },
            '& img[data-background-icon="true"], & svg[data-background-icon="true"]':
              iconStyles,
            '& .MuiDivider-root': {
              borderColor: borderColor || 'rgba(255, 255, 255, 0.2)',
              backgroundColor: borderColor || 'rgba(255, 255, 255, 0.2)',
            },
          }}
        >
          {children}
        </Box>
      </BackgroundStylesContext.Provider>
    </ThemeProvider>
  )
}

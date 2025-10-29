// @ts-check
import * as React from 'react'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import ThemeProvider from '@mui/material/styles/ThemeProvider'
import { createTheme, useTheme } from '@mui/material/styles'

const DARK_PALETTE_ENTRIES = Object.entries(
  createTheme({ palette: { mode: 'dark' } }).palette,
)
  .filter(
    ([, value]) =>
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      'main' in value &&
      typeof value.main === 'string',
  )
  .reduce((acc, [key, value]) => {
    acc[key] = {
      main: value.main,
      light: value.light,
      dark: value.dark,
      contrastText: value.contrastText,
    }
    return acc
  }, {})

/**
 * Applies themed background visuals (and optional tooltip) around popup content.
 *
 * @param {{
 *  visuals?: ReturnType<ReturnType<typeof import('@hooks/usePokemonBackgroundVisuals').usePokemonBackgroundVisuals>>
 *  tooltip?: React.ReactNode
 *  tooltipProps?: import('@mui/material/Tooltip').TooltipProps
 *  wrapperProps?: React.HTMLAttributes<HTMLDivElement>
 *  wrapWhenNoTooltip?: boolean
 *  children: React.ReactNode
 * }} props
 */
export function BackgroundCard({
  visuals,
  tooltip,
  tooltipProps,
  wrapperProps,
  wrapWhenNoTooltip = false,
  children,
}) {
  const parentTheme = useTheme()
  const hasBackground = Boolean(visuals?.hasBackground)
  const tooltipTitle =
    tooltip ?? (visuals?.backgroundMeta && visuals.backgroundMeta.tooltip)
  const surfaceStyle = hasBackground
    ? visuals?.styles?.surface || {}
    : undefined
  const iconStyles = hasBackground
    ? {
        color: visuals?.primaryColor || '#fff',
        ...(visuals?.styles?.icon || {}),
      }
    : {}
  const primaryTextShadow = visuals?.primaryTextShadow
  const borderColor = visuals?.borderColor

  const themed = React.useMemo(() => {
    if (!hasBackground) {
      return parentTheme
    }
    return createTheme(parentTheme, {
      palette: {
        mode: 'dark',
        ...DARK_PALETTE_ENTRIES,
      },
    })
  }, [hasBackground, parentTheme])

  let content = children

  if (hasBackground && visuals) {
    content = (
      <ThemeProvider theme={themed}>
        <Box
          sx={{
            ...(surfaceStyle || {}),
            color: visuals?.primaryColor || parentTheme.palette.text.primary,
            '& .MuiTypography-root': {
              textShadow: primaryTextShadow || 'none',
            },
            '& img[data-background-icon="true"], & svg[data-background-icon="true"]':
              iconStyles,
            '& .MuiDivider-root': {
              borderColor: borderColor || 'rgba(255, 255, 255, 0.2)',
              backgroundColor: borderColor || 'rgba(255, 255, 255, 0.2)',
            },
            '& .ar-task': {
              borderColor: borderColor || 'rgba(255, 255, 255, 0.2)',
            },
          }}
        >
          {children}
        </Box>
      </ThemeProvider>
    )
  }

  if (tooltipTitle) {
    return (
      <Tooltip
        title={tooltipTitle}
        arrow
        enterTouchDelay={0}
        placement="top"
        {...tooltipProps}
      >
        <div {...(wrapperProps || { style: { width: '100%' } })}>{content}</div>
      </Tooltip>
    )
  }

  if (wrapWhenNoTooltip && wrapperProps) {
    return <div {...wrapperProps}>{content}</div>
  }

  return content
}

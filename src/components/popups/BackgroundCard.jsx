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
 * Generates symmetrical margin/padding to let the background artwork bleed.
 *
 * @param {{
 *  horizontal?: number
 *  vertical?: number
 *  clampWidth?: boolean
 * }} [options]
 * @returns {React.CSSProperties}
 */
export function createFullBleedSurfaceStyle({
  horizontal = 0,
  vertical = 0,
} = {}) {
  const horizontalPixels = Number(horizontal) || 0
  const verticalPixels = Number(vertical) || 0
  const widthAdjustment = horizontalPixels * 2
  const width = widthAdjustment ? `calc(100% + ${widthAdjustment}px)` : '100%'
  return {
    margin: `${-verticalPixels}px ${-horizontalPixels}px`,
    padding: `${verticalPixels}px ${horizontalPixels}px`,
    width,
    boxSizing: 'border-box',
  }
}

/**
 * Applies themed background visuals (and optional tooltip) around popup content.
 *
 * @param {{
 *  visuals?: ReturnType<ReturnType<typeof import('@hooks/usePokemonBackgroundVisuals').usePokemonBackgroundVisuals>>
 *  tooltip?: React.ReactNode
 *  tooltipProps?: import('@mui/material/Tooltip').TooltipProps
 *  wrapperProps?: React.HTMLAttributes<HTMLDivElement>
 *  wrapWhenNoTooltip?: boolean
 *  surfaceStyle?: React.CSSProperties
 *  contentProps?: import('@mui/material/Box').BoxProps
 *  children: React.ReactNode
 * }} props
 */
export function BackgroundCard({
  visuals,
  tooltip,
  tooltipProps,
  wrapperProps,
  wrapWhenNoTooltip = false,
  surfaceStyle,
  contentProps,
  children,
}) {
  const parentTheme = useTheme()
  const hasBackground = Boolean(visuals?.hasBackground)
  const tooltipTitle =
    tooltip ?? (visuals?.backgroundMeta && visuals.backgroundMeta.tooltip)
  const iconStyles = hasBackground
    ? {
        color: visuals?.primaryColor || '#fff',
        ...(visuals?.styles?.icon || {}),
      }
    : {}
  const primaryTextShadow = visuals?.primaryTextShadow
  const borderColor = visuals?.borderColor

  const resolvedSurfaceStyle = React.useMemo(() => {
    if (!hasBackground) {
      return surfaceStyle
    }
    const base = {
      ...(visuals?.styles?.surface || {}),
    }
    if (surfaceStyle) {
      Object.assign(base, surfaceStyle)
    }
    return base
  }, [hasBackground, surfaceStyle, visuals])

  const { sx: contentSx, ...restContentProps } = contentProps || {}
  const combinedSx = React.useMemo(() => {
    const baseSx = {
      ...(resolvedSurfaceStyle || {}),
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
    }
    if (contentSx) {
      return Array.isArray(contentSx)
        ? [baseSx, ...contentSx]
        : [baseSx, contentSx]
    }
    return baseSx
  }, [
    borderColor,
    contentSx,
    iconStyles,
    parentTheme.palette.text.primary,
    primaryTextShadow,
    resolvedSurfaceStyle,
    visuals?.primaryColor,
  ])

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
        <Box {...restContentProps} sx={combinedSx}>
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

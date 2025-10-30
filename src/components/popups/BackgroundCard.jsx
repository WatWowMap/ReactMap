// @ts-check
import * as React from 'react'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import ThemeProvider from '@mui/material/styles/ThemeProvider'
import { createTheme, useTheme } from '@mui/material/styles'

const DARK_PALETTE_OVERRIDES = (() => {
  const dark = createTheme({ palette: { mode: 'dark' } }).palette
  return Object.entries(dark).reduce((acc, [key, value]) => {
    if (value && typeof value === 'object') {
      acc[key] = { ...value }
    } else {
      acc[key] = value
    }
    return acc
  }, /** @type {Record<string, unknown>} */ ({ mode: 'dark' }))
})()

/**
 * Applies themed background visuals (and optional tooltip) around popup content.
 *
 * @param {{
 *  visuals?: ReturnType<ReturnType<typeof import('@hooks/usePokemonBackgroundVisuals').usePokemonBackgroundVisuals>>
 *  tooltip?: React.ReactNode
 *  tooltipProps?: import('@mui/material/Tooltip').TooltipProps
 *  wrapperProps?: React.HTMLAttributes<HTMLDivElement>
 *  wrapWhenNoTooltip?: boolean
 *  fullWidth?: boolean
 *  fullBleed?: boolean | number | { horizontal?: number, vertical?: number }
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
  fullWidth = false,
  fullBleed,
  surfaceStyle,
  contentProps,
  children,
}) {
  const parentTheme = useTheme()
  const hasBackground = Boolean(visuals?.hasBackground)
  const tooltipTitle =
    tooltip ?? (visuals?.backgroundMeta && visuals.backgroundMeta.tooltip)
  const iconStyles = visuals?.styles?.icon || {}
  const iconBaseColor =
    iconStyles && typeof iconStyles.color === 'string'
      ? iconStyles.color
      : undefined
  const primaryIconColor = hasBackground
    ? iconBaseColor || visuals?.primaryColor || '#fff'
    : iconBaseColor
  const secondaryIconColor =
    hasBackground && visuals?.styles?.secondaryText?.color
      ? visuals.styles.secondaryText.color
      : undefined
  const primaryTextShadow = visuals?.primaryTextShadow
  const borderColor = visuals?.borderColor

  const normalizedFullBleed = React.useMemo(() => {
    if (!fullBleed) {
      return undefined
    }
    if (fullBleed === true) {
      return {}
    }
    if (typeof fullBleed === 'number') {
      return { horizontal: fullBleed, vertical: 0 }
    }
    return fullBleed
  }, [fullBleed])

  const resolvedSurfaceStyle = React.useMemo(() => {
    if (!hasBackground) {
      return surfaceStyle
    }
    const base = {
      ...(visuals?.styles?.surface || {}),
    }
    if (normalizedFullBleed) {
      const horizontalPixels = Number(normalizedFullBleed.horizontal ?? 0) || 0
      const verticalPixels = Number(normalizedFullBleed.vertical ?? 0) || 0
      const widthAdjustment = horizontalPixels * 2
      base.margin = `${-verticalPixels}px ${-horizontalPixels}px`
      base.padding = `${verticalPixels}px ${horizontalPixels}px`
      base.width = widthAdjustment
        ? `calc(100% + ${widthAdjustment}px)`
        : '100%'
      base.boxSizing = 'border-box'
    }
    if (surfaceStyle) {
      Object.assign(base, surfaceStyle)
    }
    return base
  }, [hasBackground, normalizedFullBleed, surfaceStyle, visuals])

  const { sx: contentSx, ...restContentProps } = contentProps || {}
  const combinedSx = React.useMemo(() => {
    const baseSx = {
      ...(resolvedSurfaceStyle || {}),
      color: visuals?.primaryColor || parentTheme.palette.text.primary,
      '& .MuiTypography-root': {
        textShadow: primaryTextShadow || 'none',
      },
      '& img[data-background-icon], & svg[data-background-icon]': {
        ...(iconStyles || {}),
      },
      ...(hasBackground && (primaryIconColor || secondaryIconColor)
        ? {
            '& img[data-background-icon="true"], & svg[data-background-icon="true"], & img[data-background-icon="primary"], & svg[data-background-icon="primary"]':
              primaryIconColor ? { color: primaryIconColor } : undefined,
            ...(secondaryIconColor
              ? {
                  '& img[data-background-icon="secondary"], & svg[data-background-icon="secondary"]':
                    { color: secondaryIconColor },
                }
              : {}),
          }
        : {}),
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
    primaryIconColor,
    secondaryIconColor,
    parentTheme.palette.text.primary,
    primaryTextShadow,
    resolvedSurfaceStyle,
    visuals?.primaryColor,
    hasBackground,
  ])

  const resolvedWrapperProps = React.useMemo(() => {
    if (!wrapperProps && !fullWidth) {
      return undefined
    }
    const base = wrapperProps ? { ...wrapperProps } : {}
    const existingStyle = wrapperProps?.style
    if (existingStyle || fullWidth) {
      base.style = {
        ...(existingStyle || {}),
        ...(fullWidth ? { width: '100%' } : {}),
      }
    }
    return base
  }, [fullWidth, wrapperProps])

  const themed = React.useMemo(() => {
    if (!hasBackground) {
      return parentTheme
    }
    return createTheme(parentTheme, {
      palette: {
        ...DARK_PALETTE_OVERRIDES,
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
        <div {...(resolvedWrapperProps || { style: { width: '100%' } })}>
          {content}
        </div>
      </Tooltip>
    )
  }

  if (wrapWhenNoTooltip && resolvedWrapperProps) {
    return <div {...resolvedWrapperProps}>{content}</div>
  }

  return content
}

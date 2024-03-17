// @ts-check
import * as React from 'react'
import CheckIcon from '@mui/icons-material/Check'
import ClearIcon from '@mui/icons-material/Clear'
import RuleIcon from '@mui/icons-material/Rule'

/**
 * @typedef {{
 *  status: boolean | null,
 *  partialColor?: import('@mui/material').SvgIconProps['color']
 *  checkColor?: import('@mui/material').SvgIconProps['color']
 *  clearColor?: import('@mui/material').SvgIconProps['color']
 * } & import('@mui/material').SvgIconProps} StatusIconProps
 */

/** @type {React.ForwardRefExoticComponent<StatusIconProps>} */
export const StatusIcon = React.forwardRef(
  (
    {
      status,
      color,
      partialColor = color || 'info',
      checkColor = color || 'success',
      clearColor = color || 'error',
      ...props
    },
    ref,
  ) =>
    status === null ? (
      <RuleIcon color={partialColor} ref={ref} {...props} />
    ) : status ? (
      <CheckIcon color={checkColor} ref={ref} {...props} />
    ) : (
      <ClearIcon color={clearColor} ref={ref} {...props} />
    ),
)

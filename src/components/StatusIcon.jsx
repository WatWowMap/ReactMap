// @ts-check
import * as React from 'react'
import CheckIcon from '@mui/icons-material/Check'
import ClearIcon from '@mui/icons-material/Clear'

/**
 * @typedef {{
 *  status: boolean,
 *  checkColor?: import('@mui/material').SvgIconProps['color']
 *  clearColor?: import('@mui/material').SvgIconProps['color']
 * }} StatusIconProps
 */

/** @type {React.ForwardRefExoticComponent<StatusIconProps>} */
export const StatusIcon = React.forwardRef(
  ({ status, checkColor = 'success', clearColor = 'error' }, ref) =>
    status ? (
      <CheckIcon color={checkColor} ref={ref} />
    ) : (
      <ClearIcon color={clearColor} ref={ref} />
    ),
)

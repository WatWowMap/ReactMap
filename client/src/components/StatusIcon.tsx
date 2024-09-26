// @ts-check
import * as React from 'react'
import CheckIcon from '@mui/icons-material/Check'
import ClearIcon from '@mui/icons-material/Clear'
import RuleIcon from '@mui/icons-material/Rule'
import { SvgIconProps } from '@mui/material'

interface StatusIconProps extends SvgIconProps {
  status: boolean | null
  partialColor?: SvgIconProps['color']
  checkColor?: SvgIconProps['color']
  clearColor?: SvgIconProps['color']
}

export const StatusIcon = React.forwardRef<SVGSVGElement, StatusIconProps>(
  (
    {
      status,
      color,
      partialColor = color || 'info',
      checkColor = color || 'success',
      clearColor = color || 'error',
      ...props
    }: StatusIconProps,
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

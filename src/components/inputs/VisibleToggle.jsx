// @ts-check

import * as React from 'react'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import IconButton from '@mui/material/IconButton'

/**
 *
 * @param {{ visible?: boolean } & import('@mui/material').IconButtonProps} props
 * @returns
 */
export function VisibleToggle({ visible, ...props }) {
  return (
    <IconButton {...props}>
      {visible ? <Visibility /> : <VisibilityOff />}
    </IconButton>
  )
}

// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'
import { useRelativeTimer } from '@hooks/useRelativeTime'

/**
 *
 * @param {{ expireTime?: number } & Omit<import('@mui/material').TypographyProps, 'children'>} props
 * @returns
 */
export function Timer({ expireTime, ...props }) {
  const time = useRelativeTimer(expireTime)
  return (
    <Typography variant="subtitle2" {...props}>
      {time}
    </Typography>
  )
}

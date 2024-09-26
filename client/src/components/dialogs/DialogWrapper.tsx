// @ts-check
import * as React from 'react'
import Dialog from '@mui/material/Dialog'

import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'

/**
 *
 * @param {{
 *  dialog?: keyof ReturnType<typeof useLayoutStore['getState']>,
 *  variant?: 'small' | 'large'
 *  children: React.ReactNode
 *  open?: boolean
 * } & Omit<import('@mui/material').DialogProps, 'open'>} props
 * @returns {JSX.Element}
 */
export function DialogWrapper({
  dialog,
  children,
  variant = 'large',
  maxWidth,
  ...props
}) {
  const open = useLayoutStore((s) => s[dialog])
  const isMobile = useMemory((s) => s.isMobile)

  const handleClose = React.useCallback(
    () => useLayoutStore.setState({ [dialog]: false }),
    [dialog],
  )

  return (
    <Dialog
      open={!!open}
      fullScreen={isMobile && variant === 'large'}
      fullWidth={!isMobile && variant === 'large'}
      maxWidth={
        variant === 'small' && !maxWidth ? (isMobile ? 'sm' : 'xs') : maxWidth
      }
      onClose={handleClose}
      {...props}
    >
      {children}
    </Dialog>
  )
}

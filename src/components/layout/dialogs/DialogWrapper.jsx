/* eslint-disable no-nested-ternary */
// @ts-check
import * as React from 'react'
import Dialog from '@mui/material/Dialog'
import { useLayoutStore, useStatic } from '@hooks/useStore'

/**
 *
 * @param {{
 *  dialog: keyof ReturnType<typeof useLayoutStore['getState']>,
 *  variant?: 'small' | 'large'
 *  children: React.ReactNode
 * } & Omit<import('@mui/material').DialogProps, 'open'>} props
 * @returns {JSX.Element}
 */
export function DialogWrapper({
  dialog,
  children,
  variant = 'large',
  ...props
}) {
  const open = useLayoutStore((s) => s[dialog])
  const isMobile = useStatic((s) => s.isMobile)

  const handleClose = React.useCallback(
    () => useLayoutStore.setState({ [dialog]: false }),
    [dialog],
  )

  return (
    <Dialog
      open={!!open}
      fullScreen={isMobile && variant === 'large'}
      fullWidth={!isMobile && variant === 'large'}
      maxWidth={variant === 'small' ? (isMobile ? 'sm' : 'xs') : undefined}
      onClose={handleClose}
      {...props}
    >
      {children}
    </Dialog>
  )
}

/* eslint-disable no-nested-ternary */
// @ts-check
import * as React from 'react'
import Dialog from '@mui/material/Dialog'
import { useDialogStore, useStatic } from '@hooks/useStore'

/**
 *
 * @param {{
 *  dialog: keyof ReturnType<typeof useDialogStore['getState']>,
 *  variant: 'small' | 'large'
 *  children: React.ReactNode
 * } & import('@mui/material').DialogProps} props
 * @returns {JSX.Element}
 */
export function DialogWrapper({
  dialog,
  children,
  variant = 'large',
  ...props
}) {
  const open = useDialogStore((s) => s[dialog])
  const isMobile = useStatic((s) => s.isMobile)

  const handleClose = React.useCallback(
    () => useDialogStore.setState({ [dialog]: false }),
    [dialog],
  )

  return (
    <Dialog
      open={open}
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

// @ts-check
import * as React from 'react'

import { useLayoutStore } from '@store/useLayoutStore'

import Help from '@features/tutorial/Advanced'
import { DialogWrapper } from './DialogWrapper'

export function HelpDialog() {
  const { open, category } = useLayoutStore((s) => s.help)
  const handleClose = () =>
    useLayoutStore.setState({ help: { open: false, category: '' } })
  return (
    <DialogWrapper open={open} onClose={handleClose}>
      <Help toggleHelp={handleClose} category={category} />
    </DialogWrapper>
  )
}

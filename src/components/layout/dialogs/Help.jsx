// @ts-check
import * as React from 'react'

import { useLayoutStore } from '@hooks/useLayoutStore'

import Help from './tutorial/Advanced'
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

// @ts-check
import * as React from 'react'

import { useLayoutStore } from '@store/useLayoutStore'
import { TutorialAdvanced } from '@features/tutorial/Advanced'

import { DialogWrapper } from './DialogWrapper'

export function HelpDialog() {
  const { open, category } = useLayoutStore((s) => s.help)
  const handleClose = () =>
    useLayoutStore.setState({ help: { open: false, category: '' } })
  return (
    <DialogWrapper open={open} onClose={handleClose}>
      <TutorialAdvanced toggleHelp={handleClose} category={category} />
    </DialogWrapper>
  )
}

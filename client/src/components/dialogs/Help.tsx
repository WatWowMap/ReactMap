import { useLayoutStore } from '@store/useLayoutStore'
import { TutorialAdvanced } from '@features/tutorial'

import { DialogWrapper } from './DialogWrapper'

const handleClose = () =>
  useLayoutStore.setState({ help: { open: false, category: '' } })

export function HelpDialog() {
  const { open, category } = useLayoutStore((s) => s.help)

  return (
    <DialogWrapper open={open} onClose={handleClose}>
      <TutorialAdvanced category={category} toggleHelp={handleClose} />
    </DialogWrapper>
  )
}

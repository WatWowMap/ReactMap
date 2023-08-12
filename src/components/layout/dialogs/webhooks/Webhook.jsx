// @ts-check
import * as React from 'react'
import Dialog from '@mui/material/Dialog'

import { useStatic } from '@hooks/useStore'

import Manage from './Manage'
import { setMode, useWebhookStore } from './store'

export default function Main() {
  const webhookMode = useWebhookStore((s) => !!s.mode)
  const isMobile = useStatic((s) => s.isMobile)

  return (
    <Dialog
      fullWidth={!isMobile}
      fullScreen={isMobile}
      maxWidth="md"
      open={webhookMode}
      onClose={setMode}
    >
      <Manage />
    </Dialog>
  )
}

// @ts-check
import * as React from 'react'
import Dialog from '@mui/material/Dialog'

import { useMemory } from '@hooks/useMemory'

import Manage from './Manage'
import { setMode, useWebhookStore } from './hooks/store'

export function Webhook() {
  const webhookMode = useWebhookStore((s) => s.mode === 'open')
  const isMobile = useMemory((s) => s.isMobile)

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

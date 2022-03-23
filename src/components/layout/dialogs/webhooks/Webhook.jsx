import React, { useState } from 'react'
import {
  useMediaQuery, Dialog,
} from '@material-ui/core'
import { useTheme } from '@material-ui/core/styles'

import useStyles from '@hooks/useStyles'
import { useStore, useStatic } from '@hooks/useStore'
import useHash from '@hooks/useHash'

import DraggableMarker from './Draggable'
import Manage from './Manage'
import AreaSelection from './AreaSelection'

export default function Main({
  webhookMode, setWebhookMode, Icons, map,
}) {
  const theme = useTheme()
  const classes = useStyles()
  const [, toggleHash] = useHash()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  const isTablet = useMediaQuery(theme.breakpoints.only('sm'))

  const [selectedAreas, setSelectedAreas] = useState([])
  const [webhookLocation, setWebhookLocation] = useState([])

  const webhookData = useStatic(s => s.webhookData)
  const setWebhookData = useStatic(s => s.setWebhookData)

  const selectedWebhook = useStore(s => s.selectedWebhook)
  const setSelectedWebhook = useStore(s => s.setSelectedWebhook)

  const handleWebhookClose = () => {
    toggleHash(false, [selectedWebhook])
    setWebhookMode(false)
  }

  return (
    <>
      <Dialog
        classes={{
          scrollPaper: classes.scrollPaper,
          container: classes.container,
        }}
        fullWidth={!isMobile}
        fullScreen={isMobile}
        style={{ display: webhookMode === 'open' ? 'block' : 'none' }}
        maxWidth="md"
        open={Boolean(webhookMode)}
        onClose={handleWebhookClose}
      >
        <Manage
          map={map}
          isMobile={isMobile}
          isTablet={isTablet}
          Icons={Icons}
          webhookData={webhookData}
          setWebhookData={setWebhookData}
          webhookMode={webhookMode}
          setWebhookMode={setWebhookMode}
          selectedAreas={selectedAreas}
          setSelectedAreas={setSelectedAreas}
          webhookLocation={webhookLocation}
          setWebhookLocation={setWebhookLocation}
          selectedWebhook={selectedWebhook}
          setSelectedWebhook={setSelectedWebhook}
          handleWebhookClose={handleWebhookClose}
        />
      </Dialog>
      {webhookMode === 'location' && (
        <DraggableMarker
          map={map}
          setWebhookMode={setWebhookMode}
          webhookLocation={webhookLocation}
          setWebhookLocation={setWebhookLocation}
        />
      )}
      {webhookMode === 'areas' && (
        <AreaSelection
          webhookMode={webhookMode}
          setWebhookMode={setWebhookMode}
          selectedAreas={selectedAreas}
          setSelectedAreas={setSelectedAreas}
          selectedWebhook={selectedWebhook}
          webhookData={webhookData}
        />
      )}
    </>
  )
}

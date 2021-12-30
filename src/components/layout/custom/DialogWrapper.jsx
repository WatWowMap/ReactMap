import React from 'react'
import { DialogContent, Grid } from '@material-ui/core'

import { useStatic } from '@hooks/useStore'

import Header from '../general/Header'
import Footer from '../general/Footer'

export default function CustomWrapper({ configObj, defaultTitle, contentBody, handleClose }) {
  const { perms } = useStatic(s => s.auth)
  const footerOptions = [{ name: 'close', action: handleClose, color: 'primary' }]

  if (configObj.footerButtons.length) {
    footerOptions.unshift(...configObj.footerButtons.filter(button => (
      !button.donorOnly && !button.freeloaderOnly)
      || (button.donorOnly && perms.donor)
      || (button.freeloaderOnly && !perms.donor)))
  }

  return (
    <>
      <Header titles={configObj.titles?.length ? configObj.titles : [defaultTitle]} />
      <DialogContent>
        <Grid
          container
          spacing={configObj.settings.parentSpacing || 0}
          alignItems={configObj.settings.parentAlignItems || 'center'}
          justifyContent={configObj.settings.parentJustifyContent || 'center'}
          style={configObj.settings.parentStyle || {}}
        >
          {contentBody}
        </Grid>
      </DialogContent>
      <Footer options={footerOptions} />
    </>
  )
}

// @ts-check
/* eslint-disable react/no-array-index-key */
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import CustomTile from '@components/layout/custom/CustomTile'
import DialogWrapper from '@components/layout/custom/DialogWrapper'
import ErrorBoundary from '@components/ErrorBoundary'

import { useSafeParse } from '../hooks/useSafeParse'
import { usePlayStore } from '../hooks/store'

export function Viewer() {
  const hideEditor = usePlayStore((s) => s.hideEditor)
  const component = usePlayStore((s) => s.component)
  const configObj = useSafeParse()

  if (!configObj) return null

  return (
    <Grid
      xs={12}
      sm={hideEditor ? 12 : 6}
      overflow="auto"
      height="calc(100vh - 48px)"
    >
      <ErrorBoundary
        noRefresh
        resettable
        style={{ width: hideEditor ? '100%' : '50%' }}
      >
        {component === 'loginPage' ? (
          <Grid
            container
            spacing={configObj.settings.parentSpacing || 0}
            alignItems={configObj.settings.parentAlignItems || 'center'}
            justifyContent={configObj.settings.parentJustifyContent || 'center'}
            style={configObj.settings.parentStyle || {}}
            sx={configObj.settings.parentSx || {}}
          >
            {configObj.components.map((block, i) => (
              <CustomTile key={i} block={block} />
            ))}
          </Grid>
        ) : (
          <Grid container height="100%" pb={16} pt={4}>
            <DialogWrapper
              configObj={configObj}
              defaultTitle={
                component === 'donorPage' ? 'donor_page' : 'message_of_the_day'
              }
              handleClose={() => {}}
            >
              {configObj.components.map((block, i) => (
                <CustomTile key={i} block={block} />
              ))}
            </DialogWrapper>
          </Grid>
        )}
      </ErrorBoundary>
    </Grid>
  )
}

export const MemoizedViewer = React.memo(Viewer)

// @ts-check
/* eslint-disable react/no-array-index-key */

import { ErrorBoundary } from '@components/ErrorBoundary'
import { CustomDialog, CustomTile } from '@features/builder'
import Grid from '@mui/material/Unstable_Grid2'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayStore } from '../hooks/store'
import { useSafeParse } from '../hooks/useSafeParse'

export function Viewer() {
  const hideEditor = usePlayStore((s) => s.hideEditor)
  const component = usePlayStore((s) => s.component)
  const configObj = useSafeParse()
  const { i18n } = useTranslation()

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
            key={i18n.language}
            container
            spacing={configObj.settings.parentSpacing || 0}
            alignItems={configObj.settings.parentAlignItems || 'center'}
            justifyContent={configObj.settings.parentJustifyContent || 'center'}
            style={configObj.settings.parentStyle || {}}
            sx={configObj.settings.parentSx || {}}
          >
            {configObj.components.map((block, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: pre-existing, tracked for follow-up
              <CustomTile key={i} block={block} />
            ))}
          </Grid>
        ) : (
          <Grid height="100%" pb={16} pt={4}>
            <CustomDialog
              configObj={configObj}
              defaultTitle={
                component === 'donorPage' ? 'donor_page' : 'message_of_the_day'
              }
              handleClose={() => {}}
            >
              {configObj.components.map((block, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: pre-existing, tracked for follow-up
                <CustomTile key={i} block={block} />
              ))}
            </CustomDialog>
          </Grid>
        )}
      </ErrorBoundary>
    </Grid>
  )
}

export const MemoizedViewer = React.memo(Viewer)

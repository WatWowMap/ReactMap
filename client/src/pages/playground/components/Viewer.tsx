import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import { useTranslation } from 'react-i18next'
import { CustomTile, CustomDialog } from '@features/builder'
import { ErrorBoundary } from '@components/ErrorBoundary'

import { useSafeParse } from '../hooks/useSafeParse'
import { usePlayStore } from '../hooks/store'

export function Viewer() {
  const hideEditor = usePlayStore((s) => s.hideEditor)
  const component = usePlayStore((s) => s.component)
  const configObj = useSafeParse()
  const { i18n } = useTranslation()

  if (!configObj) return null

  return (
    <Grid
      height="calc(100vh - 48px)"
      overflow="auto"
      sm={hideEditor ? 12 : 6}
      xs={12}
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
            alignItems={configObj.settings.parentAlignItems || 'center'}
            justifyContent={configObj.settings.parentJustifyContent || 'center'}
            spacing={configObj.settings.parentSpacing || 0}
            style={configObj.settings.parentStyle || {}}
            sx={configObj.settings.parentSx || {}}
          >
            {configObj.components.map((block, i) => (
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

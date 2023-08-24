// @ts-check
/* eslint-disable react/no-array-index-key */
import * as React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2'
import Box from '@mui/material/Box'
import CustomTile from '@components/layout/custom/CustomTile'
import DialogWrapper from '@components/layout/custom/DialogWrapper'
import { useSafeParse } from '../hooks/useSafeParse'
import { usePlayStore } from '../hooks/store'

export function Viewer() {
  const hideEditor = usePlayStore((s) => s.hideEditor)
  const component = usePlayStore((s) => s.component)
  const configObj = useSafeParse()

  React.useEffect(() => {
    usePlayStore.setState({ valid: !!configObj })
  }, [configObj])

  if (!configObj) return null

  return (
    <Grid2 xs={hideEditor ? 12 : 6} overflow="auto" height="calc(100vh - 48px)">
      {component === 'loginPage' ? (
        <Grid2
          xs={12}
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
        </Grid2>
      ) : (
        <Box height="100%" pb={16} pt={4}>
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
        </Box>
      )}
    </Grid2>
  )
}

export const MemoizedViewer = React.memo(Viewer)

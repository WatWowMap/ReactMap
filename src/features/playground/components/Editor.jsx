// @ts-check
import * as React from 'react'
import { useTheme } from '@mui/material/styles'
import Grid2 from '@mui/material/Unstable_Grid2'
import Editor from '@monaco-editor/react'

import { setCode, usePlayStore } from '../hooks/store'

export function CodeWrapper() {
  const hideEditor = usePlayStore((s) => s.hideEditor)

  return (
    <Grid2
      xs={hideEditor ? 0 : 6}
      display={hideEditor ? 'none' : 'block'}
      overflow="auto"
      height="calc(100vh - 48px)"
    >
      <CodeEditor />
    </Grid2>
  )
}

export function CodeEditor() {
  const theme = useTheme()
  const code = usePlayStore((s) => s.code)

  return (
    <Editor
      theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'vs-light'}
      defaultLanguage="json"
      value={code}
      onChange={setCode}
    />
  )
}

export const MemoizedCodeWrapper = React.memo(CodeWrapper)

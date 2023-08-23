import { create } from 'zustand'
import { SelectChangeEvent } from '@mui/material'
import { downloadJson } from '@services/functions/downloadJson'

export const usePlayStore = create(() => ({
  code: '',
  hideEditor: false,
  component: 'loginPage',
  valid: true,
}))

export const setCode = (code: string | object) => {
  if (typeof code === 'object') {
    return usePlayStore.setState({ code: JSON.stringify(code, null, 2) })
  }
  if (typeof code === 'string') {
    return usePlayStore.setState({ code })
  }
}

export const setComponent = ({ target }: SelectChangeEvent<string>) =>
  usePlayStore.setState({ component: target.value })

export const toggleEditor = () =>
  usePlayStore.setState((s) => ({ hideEditor: !s.hideEditor }))

export const handleDownload = () => {
  try {
    const { code, component } = usePlayStore.getState()
    downloadJson(JSON.parse(code), `${component}.json`)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e)
    // eslint-disable-next-line no-alert
    alert('Invalid JSON')
  }
}

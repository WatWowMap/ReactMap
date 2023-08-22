// @ts-check
import { create } from 'zustand'
import { downloadJson } from '@services/functions/downloadJson'

export const usePlayStore = create(() => ({
  code: '',
  hideEditor: false,
  component: 'loginPage',
  valid: true,
}))

/** @param {string | object} code */
export const setCode = (code) => {
  if (typeof code === 'object') {
    return usePlayStore.setState({ code: JSON.stringify(code, null, 2) })
  }
  if (typeof code === 'string') {
    return usePlayStore.setState({ code })
  }
}

/** @param {import('@mui/material').SelectChangeEvent<string>} event */
export const setComponent = ({ target }) =>
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

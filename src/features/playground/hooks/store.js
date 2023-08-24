// @ts-check
import { create } from 'zustand'
import { downloadJson } from '@services/functions/downloadJson'
import apolloClient from '@services/apollo'
import { CUSTOM_COMPONENT } from '@services/queries/config'

export const usePlayStore = create(() => ({
  code: '{}',
  original: '{}',
  hideEditor: false,
  component: 'loginPage',
  valid: true,
}))

/**
 * Sets the code in the editor, accepts either an object or a string
 * @param {string | object} code
 */
export const setCode = (code) => {
  if (typeof code === 'object') {
    return usePlayStore.setState({ code: JSON.stringify(code, null, 2) })
  }
  if (typeof code === 'string') {
    return usePlayStore.setState({ code })
  }
}

/**
 * Sets the component to be used in the editor
 * @param {ReturnType<typeof usePlayStore['getState']>['component']} component
 */
export const setComponent = (component) => usePlayStore.setState({ component })

/**
 * Shows or hides the editor to enable fullscreen viewing of what's being worked on
 */
export const toggleEditor = () =>
  usePlayStore.setState((s) => ({ hideEditor: !s.hideEditor }))

/**
 * Creates an element and clicks it to download the JSON
 */
export const handleDownload = () => {
  try {
    const { code, component } = usePlayStore.getState()
    downloadJson(code, `${component}.json`)
    usePlayStore.setState({ original: code })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e)
    // eslint-disable-next-line no-alert
    alert('Invalid JSON')
  }
}

/**
 * fetches the code from config to load into the editor
 * @param {ReturnType<typeof usePlayStore['getState']>['component']} component
 */
export const fetchCode = async (component) => {
  const { data } = await apolloClient.query({
    query: CUSTOM_COMPONENT,
    variables: { component },
  })
  const stringified = JSON.stringify(data?.customComponent || {}, null, 2)
  usePlayStore.setState({ original: stringified, code: stringified })
}

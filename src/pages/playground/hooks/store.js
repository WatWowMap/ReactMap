// @ts-check
import { create } from 'zustand'
import { downloadJson } from '@utils/downloadJson'

/**
 * @typedef {{
 *  code: string
 *  original: string
 *  hideEditor: boolean
 *  component: string
 *  valid: boolean
 *  success: string | null
 *  loading: boolean
 *  error: import('@apollo/client').ApolloError
 *  menuAnchorEl: null | HTMLElement
 * }} PlayStore
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<PlayStore>>}
 */
export const usePlayStore = create(() => ({
  code: '{}',
  original: '{}',
  hideEditor: false,
  component: 'loginPage',
  valid: true,
  loading: false,
  success: null,
  error: null,
  menuAnchorEl: null,
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
 * Opens the main menu
 * @param {React.MouseEvent<HTMLButtonElement, MouseEvent>} e
 */
export const openMenu = (e) =>
  usePlayStore.setState({ menuAnchorEl: e.currentTarget })

/**
 * Closes the main menu
 */
export const closeMenu = () => usePlayStore.setState({ menuAnchorEl: null })

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
    usePlayStore.setState({ original: code, menuAnchorEl: null })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e)
    usePlayStore.setState({ error: e.message })
  }
}

/**
 * Handles resetting all of the various states
 * @returns
 */
export const handleReset = () =>
  usePlayStore.setState({
    loading: false,
    success: null,
    error: null,
  })

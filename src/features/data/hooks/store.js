// @ts-check
import { create } from 'zustand'

/**
 * @typedef {'all' | 'general' | 'filter'} DataCategory
 * @typedef {{
 *  resetGeneralHover: boolean
 *  resetFiltersHover: boolean
 *  resetList: Record<string, boolean>
 *  notification: boolean
 *  severity: import('@mui/material').AlertProps['severity'],
 *  message: string
 * }} DataManagementStore
 */

/** @type {DataManagementStore} */
const DEFAULT_STATE = {
  resetGeneralHover: false,
  resetFiltersHover: false,
  resetList: {},
  notification: false,
  severity: 'success',
  message: '',
}

/** @type {import("zustand").UseBoundStore<import("zustand").StoreApi<DataManagementStore>>} */
export const useDataManagementStore = create(() => ({ ...DEFAULT_STATE }))

/**
 * @param {string} label
 * @param {DataCategory | ''} [category]
 */
export const setNotification = (label, category) => {
  useDataManagementStore.setState((prev) => ({
    notification: true,
    severity: 'success',
    message: label,
    resetList: { ...prev.resetList, [category || label]: true },
  }))
}

export const restoreDefault = () =>
  useDataManagementStore.setState({ ...DEFAULT_STATE })

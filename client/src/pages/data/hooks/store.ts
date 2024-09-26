import { create } from 'zustand'

export type DataCategory = 'all' | 'general' | 'filter'

export type DataManagementStore = {
  resetGeneralHover: boolean
  resetFiltersHover: boolean
  resetList: Record<string, boolean>
  notification: boolean
  severity: import('@mui/material').AlertProps['severity']
  message: string
}

const DEFAULT_STATE: DataManagementStore = {
  resetGeneralHover: false,
  resetFiltersHover: false,
  resetList: {},
  notification: false,
  severity: 'success',
  message: '',
}

export const useDataManagementStore = create<DataManagementStore>(() => ({
  ...DEFAULT_STATE,
}))

export const setNotification = (label: string, category: DataCategory | '') => {
  useDataManagementStore.setState((prev) => ({
    notification: true,
    severity: 'success',
    message: label,
    resetList: { ...prev.resetList, [category || label]: true },
  }))
}

export const restoreDefault = () =>
  useDataManagementStore.setState({ ...DEFAULT_STATE })

// @ts-check
import * as React from 'react'

import { SelectorItem } from '@features/drawer/SelectorItem'

import { useWebhookStore } from '../hooks/store'
import { Poracle } from '../services/Poracle'

/** @param {import('@features/drawer/SelectorItem').BaseProps<import('@rm/types').AllButHuman>} props */
export function WebhookItem({ id, category, ...props }) {
  const filter = useWebhookStore((s) => s.tempFilters[id])

  const setFilter = (newFilter) => {
    useWebhookStore.setState((prev) => ({
      tempFilters: {
        ...prev.tempFilters,
        [id]: newFilter
          ? {
              ...newFilter,
              enabled: newFilter.enabled,
            }
          : { enabled: true, ...Poracle.getOtherData(id) },
      },
    }))
  }
  return (
    <SelectorItem
      {...props}
      id={id}
      filter={filter}
      setFilter={setFilter}
      onClick={() =>
        useWebhookStore.setState({
          advanced: {
            id,
            uid: 0,
            open: true,
            category,
            selectedIds: [],
          },
        })
      }
    />
  )
}

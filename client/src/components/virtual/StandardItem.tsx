// @ts-check
import * as React from 'react'

import { useLayoutStore } from '@store/useLayoutStore'
import { useDeepStore, useStorage } from '@store/useStorage'
import { checkIfHasAll } from '@utils/hasAll'

import { SelectorItem } from './SelectorItem'

/** @param {import('./SelectorItem').BaseProps<keyof import('@rm/types').Available>} props */
export function StandardItem({ id, category, ...props }) {
  const [filter, setFilter] = useDeepStore(`filters.${category}.filter.${id}`)
  const hasAll = checkIfHasAll(category, id)
  const easyMode = useStorage((s) => !!s.filters?.[category]?.easyMode)
  return (
    <SelectorItem
      {...props}
      id={id}
      filter={filter}
      setFilter={setFilter}
      hasAll={hasAll}
      easyMode={easyMode}
      onClick={() =>
        useLayoutStore.setState(
          id.startsWith('t')
            ? { slotSelection: id }
            : {
                advancedFilter: {
                  open: true,
                  id,
                  category,
                  selectedIds: [],
                },
              },
        )
      }
    />
  )
}

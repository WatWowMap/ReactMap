import { useLayoutStore } from '@store/useLayoutStore'
import { useDeepStore, useStorage } from '@store/useStorage'
import { checkIfHasAll } from '@utils/hasAll'

import { SelectorItem } from './SelectorItem'

export function StandardItem({
  id,
  category,
  ...props
}: import('./SelectorItem').BaseProps<keyof import('@rm/types').Available>) {
  const [filter, setFilter] = useDeepStore(`filters.${category}.filter.${id}`)
  const hasAll = checkIfHasAll(category, id)
  // @ts-ignore
  const easyMode = useStorage((s) => !!s.filters?.[category]?.easyMode)

  return (
    <SelectorItem
      {...props}
      easyMode={easyMode}
      filter={filter}
      hasAll={hasAll}
      id={id}
      setFilter={setFilter}
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

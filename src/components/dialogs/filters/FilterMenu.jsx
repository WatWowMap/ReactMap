// @ts-check
import * as React from 'react'
import Menu from '@components/Menu'

import { toggleDialog, useLayoutStore } from '@hooks/useLayoutStore'
import { useStorage } from '@hooks/useStorage'
import { StandardItem } from '@features/drawer/SelectorItem'

import { DialogWrapper } from '../DialogWrapper'

export default function FilterMenu() {
  const { open, category, type } = useLayoutStore((s) => s.dialog)
  const filters = useStorage((s) => s.filters?.[category])

  const [tempFilters, setTempFilters] = React.useState(filters?.filter)

  const extraButtons = React.useMemo(
    () =>
      /** @type {import('@components/Footer').FooterButton[]} */ ([
        {
          name: 'close',
          action: toggleDialog(false, category, 'filters'),
          color: 'secondary',
        },
      ]),
    [category],
  )

  React.useEffect(() => {
    setTempFilters(filters?.filter)
  }, [category, filters?.filter])

  if (!category || !type) return null
  return (
    <DialogWrapper
      open={open && type === 'filters' && !!tempFilters}
      onClose={toggleDialog(false, category, type)}
      maxWidth="md"
    >
      <Menu
        category={category}
        title={`${category}_filters`}
        titleAction={toggleDialog(false, category, 'filters')}
        tempFilters={tempFilters}
        extraButtons={extraButtons}
      >
        {(_, key) => <StandardItem id={key} category={category} caption />}
      </Menu>
    </DialogWrapper>
  )
}

// @ts-check
import * as React from 'react'

import { toggleDialog, useLayoutStore } from '@store/useLayoutStore'
import { useStorage } from '@store/useStorage'
import { StandardItem } from '@components/virtual/StandardItem'
import { Menu } from '@components/Menu'

import { DialogWrapper } from '../dialogs/DialogWrapper'

export function FilterMenu() {
  const { open, category, type } = useLayoutStore((s) => s.dialog)
  const filters = useStorage((s) => s.filters?.[category])

  const [tempFilters, setTempFilters] = React.useState(filters?.filter)

  const extraButtons = React.useMemo(
    () =>
      /** @type {import('@components/dialogs/Footer').FooterButton[]} */ ([
        {
          name: 'close',
          action: toggleDialog(false),
          color: 'secondary',
        },
      ]),
    [category],
  )

  React.useEffect(() => {
    setTempFilters(filters?.filter)
  }, [category, filters?.filter])

  if (!category || !type || !tempFilters) return null
  return (
    <DialogWrapper
      open={open && type === 'filters' && !!tempFilters}
      onClose={toggleDialog(false)}
      maxWidth="md"
    >
      <Menu
        category={category}
        title={`${category}_filters`}
        titleAction={toggleDialog(false)}
        tempFilters={tempFilters}
        extraButtons={extraButtons}
      >
        {(_, key) => <StandardItem id={key} category={category} caption />}
      </Menu>
    </DialogWrapper>
  )
}

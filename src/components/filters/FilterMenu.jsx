// @ts-check
import * as React from 'react'

import { toggleDialog, useLayoutStore } from '@store/useLayoutStore'
import { useStorage } from '@store/useStorage'
import { StandardItem } from '@components/virtual/StandardItem'
import { Menu } from '@components/Menu'

import { DialogWrapper } from '../dialogs/DialogWrapper'

/** @type {import('@components/dialogs/Footer').FooterButton[]} */
const EXTRA_BUTTONS = [
  {
    name: 'close',
    action: toggleDialog(false),
    color: 'secondary',
  },
]

export function FilterMenu() {
  const { open, category, type } = useLayoutStore((s) => s.dialog)
  const filters = useStorage((s) => s.filters?.[category])
  const tempFilters = React.useMemo(() => filters?.filter, [filters?.filter])

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
        extraButtons={EXTRA_BUTTONS}
      >
        {(_, key) => <StandardItem id={key} category={category} caption />}
      </Menu>
    </DialogWrapper>
  )
}

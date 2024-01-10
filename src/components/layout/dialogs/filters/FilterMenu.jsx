// @ts-check
import * as React from 'react'
import Menu from '@components/layout/general/Menu'

import { toggleDialog, useLayoutStore } from '@hooks/useLayoutStore'
import { useStorage } from '@hooks/useStorage'
import { StandardItem } from '@components/layout/drawer/SelectorItem'

import { DialogWrapper } from '../DialogWrapper'

export default function FilterMenu() {
  const { open, category, type } = useLayoutStore((s) => s.dialog)
  const filters = useStorage((s) => s.filters[category])

  const [tempFilters, setTempFilters] = React.useState(filters?.filter)

  /** @type {import('@components/layout/general/Footer').FooterButton[]} */
  const extraButtons = React.useMemo(
    () => [
      {
        name: 'save',
        action: toggleDialog(false, category, 'filters'),
        icon: 'Save',
        color: 'secondary',
      },
    ],
    [category],
  )

  React.useEffect(() => {
    setTempFilters(filters?.filter)
  }, [category, filters?.filter])

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

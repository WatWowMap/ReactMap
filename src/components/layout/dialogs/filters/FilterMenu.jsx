import * as React from 'react'
import Menu from '@components/layout/general/Menu'
import Tile from '@components/layout/dialogs/filters/MenuTile'

import { toggleDialog, useLayoutStore, useStore } from '@hooks/useStore'
import { DialogWrapper } from '../DialogWrapper'

export default function FilterMenu() {
  const { open, category, type } = useLayoutStore((s) => s.dialog)
  const filters = useStore((s) => s.filters[category])

  const [tempFilters, setTempFilters] = React.useState(filters?.filter)

  React.useEffect(() => {
    setTempFilters(filters?.filter)
  }, [category])

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
        filters={filters}
        Tile={Tile}
        tempFilters={tempFilters}
        setTempFilters={setTempFilters}
        extraButtons={[
          {
            name: 'save',
            action: toggleDialog(false, category, 'filters', tempFilters),
            icon: 'Save',
            color: 'secondary',
          },
        ]}
      />
    </DialogWrapper>
  )
}

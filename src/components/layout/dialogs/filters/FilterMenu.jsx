import React, { useState } from 'react'
import Menu from '@components/layout/general/Menu'
import Tile from '@components/layout/dialogs/filters/MenuTile'

export default function FilterMenu({
  toggleDialog,
  category,
  isMobile,
  isTablet,
  filters,
}) {
  const [tempFilters, setTempFilters] = useState(filters.filter)
  return (
    <Menu
      category={category}
      title={`${category}_filters`}
      titleAction={toggleDialog(false, category, 'filters')}
      isMobile={isMobile}
      isTablet={isTablet}
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
  )
}

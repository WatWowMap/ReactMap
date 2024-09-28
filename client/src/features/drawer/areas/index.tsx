import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { useStorage } from '@store/useStorage'
import { BasicListButton } from '@components/inputs/BasicListButton'
import { GenericSearch } from '@components/inputs/GenericSearch'

import { ScanAreasTable } from './AreaTable'

const onClick = () => useStorage.getState().setAreas()

function Area() {
  return (
    <>
      <BasicListButton label="reset" onClick={onClick}>
        <RestartAltIcon color="error" />
      </BasicListButton>
      <ListItem>
        <GenericSearch field="filters.scanAreas.filter.search" label="search" />
      </ListItem>
      <ListItem>
        <ScanAreasTable />
      </ListItem>
    </>
  )
}

export const AreaSection = React.memo(Area)

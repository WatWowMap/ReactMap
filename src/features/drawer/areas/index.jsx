// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import RestartAltIcon from '@mui/icons-material/RestartAlt'

import { useStorage } from '@hooks/useStorage'
import { BasicListButton } from '@components/BasicListButton'

import { GenericSearch } from '../ItemSearch'
import { ScanAreasTable } from './AreaTable'

const onClick = () => useStorage.getState().setAreas()

function AreaDropDown() {
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

export default React.memo(AreaDropDown)

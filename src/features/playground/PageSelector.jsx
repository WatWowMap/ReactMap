// @ts-check
import * as React from 'react'
import { useQuery } from '@apollo/client'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { CUSTOM_COMPONENT } from '@services/queries/config'

import { setCode, setComponent, usePlayStore } from './store'

const PAGES = ['loginPage', 'messageOfTheDay', 'donorPage']

export function PageSelector() {
  const component = usePlayStore((s) => s.component)

  const { data } = useQuery(CUSTOM_COMPONENT, {
    fetchPolicy: 'no-cache',
    variables: { component },
  })

  React.useEffect(() => {
    if (data?.customComponent) {
      setCode(data.customComponent)
    }
  }, [data])

  return (
    <Select size="small" value={component} onChange={setComponent}>
      {PAGES.map((c) => (
        <MenuItem key={c} value={c}>
          {c}
        </MenuItem>
      ))}
    </Select>
  )
}

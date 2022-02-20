import React, { useState } from 'react'
import {
  Grid, DialogContent, IconButton,
} from '@material-ui/core'
import {
  Clear, Check,
} from '@material-ui/icons'

import { useStatic } from '@hooks/useStore'

import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'
import Size from './Size'

export default function SlotSelection({ teamId, toggleSlotsMenu, tempFilters, isMobile }) {
  const Icons = useStatic(state => state.Icons)
  const [filterValues, setFilterValues] = useState(tempFilters)
  const [team] = useState(`t${teamId}-0`)

  const relevantSlots = Object.keys(filterValues).filter(each => each.charAt(0) === 'g' && each.charAt(1) === teamId)

  const handleSizeChange = (name, value) => {
    const slotsObj = filterValues
    if (name === 'default') {
      const resetValues = { enabled: true, size: 'md' }
      slotsObj[team] = resetValues
      relevantSlots.forEach(slot => slotsObj[slot] = resetValues)
    } else {
      slotsObj[team].size = value
      relevantSlots.forEach(slot => slotsObj[slot].size = value)
    }
    setFilterValues({ ...slotsObj })
  }

  return (
    <>
      <Header titles={[`team_${teamId}`, 'slot_selection']} action={toggleSlotsMenu(false)} />
      <DialogContent style={{ color: 'white' }}>
        <Grid
          container
          direction="row"
          justifyContent="center"
          alignItems="center"
        >
          {relevantSlots.map(each => (
            <Grid
              container
              item
              key={each}
              xs={12}
              sm={6}
              direction="row"
              alignItems="center"
              justifyContent="center"
            >
              <Grid item xs={2} style={{ textAlign: 'center' }}>
                <img src={Icons.getGyms(...each.slice(1).split('-'))} style={{ maxWidth: 50, maxHeight: 50 }} alt={each} />
              </Grid>
              <Grid item xs={8} style={{ textAlign: 'center' }}>
                <Size
                  filterValues={filterValues[each]}
                  handleChange={(name, value) => {
                    setFilterValues({
                      ...filterValues,
                      [each]: {
                        ...filterValues[each],
                        [name]: value,
                      },
                    })
                  }}
                  btnSize="small"
                />
              </Grid>
              <Grid item xs={2}>
                <IconButton onClick={() => {
                  setFilterValues({
                    ...filterValues,
                    [each]: {
                      ...filterValues[each],
                      enabled: !filterValues[each].enabled,
                    },
                  })
                }}
                >
                  {filterValues[each].enabled
                    ? <Check style={{ color: '#00e676' }} />
                    : <Clear color="primary" />}
                </IconButton>
              </Grid>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <Footer options={[
        {
          key: 'size',
          component: <Size
            filterValues={filterValues[team]}
            handleChange={handleSizeChange}
            btnSize="medium"
          />,
          size: isMobile ? 8 : 7,
        },
        { name: 'reset', action: () => handleSizeChange('default'), color: 'primary', icon: 'Replay', size: 2 },
        { name: 'save', action: toggleSlotsMenu(false, teamId, filterValues), color: 'secondary', icon: 'Save', size: isMobile ? 2 : 3 },
      ]}
      />
    </>
  )
}

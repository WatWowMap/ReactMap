import React, { useState } from 'react'
import Clear from '@mui/icons-material/Clear'
import Check from '@mui/icons-material/Check'
import { Grid, DialogContent, IconButton } from '@mui/material'

import { useStatic } from '@hooks/useStore'

import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'
import Size from './Size'

export default function SlotSelection({
  teamId,
  toggleSlotsMenu,
  tempFilters,
  isMobile,
}) {
  const Icons = useStatic((state) => state.Icons)
  const [filterValues, setFilterValues] = useState(tempFilters)
  const [team] = useState(`t${teamId}-0`)

  const relevantSlots = Object.keys(filterValues).filter(
    (each) => each.charAt(0) === 'g' && each.charAt(1) === teamId,
  )

  const handleSizeChange = (name, value) => {
    const slotsObj = filterValues
    if (name === 'all') {
      slotsObj[team].enabled = value
      relevantSlots.forEach((slot) => (slotsObj[slot].enabled = value))
    } else {
      slotsObj[team].size = value
      relevantSlots.forEach((slot) => (slotsObj[slot].size = value))
    }
    setFilterValues({ ...slotsObj })
  }

  return (
    <>
      <Header
        titles={[`team_${teamId}`, 'slot_selection']}
        action={toggleSlotsMenu(false)}
      />
      <DialogContent style={{ color: 'white' }}>
        <Grid
          container
          direction="row"
          justifyContent="center"
          alignItems="center"
        >
          {relevantSlots.map((each) => (
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
                <img
                  src={Icons.getGyms(...each.slice(1).split('-'))}
                  style={{ maxWidth: 50, maxHeight: 50 }}
                  alt={each}
                />
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
                <IconButton
                  onClick={() => {
                    setFilterValues({
                      ...filterValues,
                      [each]: {
                        ...filterValues[each],
                        enabled: !filterValues[each].enabled,
                      },
                    })
                  }}
                  size="large"
                >
                  {filterValues[each].enabled ? (
                    <Check style={{ color: '#00e676' }} />
                  ) : (
                    <Clear color="primary" />
                  )}
                </IconButton>
              </Grid>
            </Grid>
          ))}
          {isMobile && (
            <Grid
              item
              xs={12}
              style={{ textAlign: 'center', margin: '15px 0' }}
            >
              <Size
                filterValues={filterValues[team]}
                handleChange={handleSizeChange}
                btnSize="medium"
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <Footer
        options={[
          ...(isMobile
            ? []
            : [
                {
                  key: 'size',
                  component: (
                    <Size
                      filterValues={filterValues[team]}
                      handleChange={handleSizeChange}
                      btnSize="medium"
                    />
                  ),
                  size: 6,
                },
              ]),
          {
            name: 'disable_all',
            action: () => handleSizeChange('all', false),
            color: 'primary',
            icon: 'Clear',
            size: 2,
          },
          {
            name: 'enable_all',
            action: () => handleSizeChange('all', true),
            color: '#00e676',
            icon: 'Check',
            size: 2,
          },
          {
            name: 'save',
            action: toggleSlotsMenu(false, teamId, filterValues),
            color: 'secondary',
            icon: 'Save',
            size: 2,
          },
        ]}
      />
    </>
  )
}

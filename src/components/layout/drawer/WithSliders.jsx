import React, { useEffect, useState } from 'react'
import {
  Grid, Typography, FormControlLabel, Switch, AppBar, Tab, Tabs, Box,
} from '@material-ui/core'

import StringFilter from '../dialogs/filters/StringFilter'
import SliderTile from '../dialogs/filters/SliderTile'
import Utility from '../../../services/Utility'

function TabPanel(props) {
  const { children, value, index } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
    >
      {value === index && (
        <Box p={2}>
          <Typography variant="caption">{children}</Typography>
        </Box>
      )}
    </div>
  )
}

export default function WithSliders({
  category, filters, setFilters, context, specificFilter,
}) {
  const [tempLegacy, setTempLegacy] = useState(filters[category][specificFilter])
  const [openTab, setOpenTab] = useState(0)

  const handleLegacySwitch = () => {
    setFilters({
      ...filters,
      [category]: {
        ...filters[category],
        legacy: !filters[category].legacy,
      },
    })
  }

  useEffect(() => {
    setFilters({
      ...filters,
      [category]: {
        ...filters[category],
        [specificFilter]: tempLegacy,
      },
    })
  }, [tempLegacy])

  const handleChange = (event, values) => {
    if (typeof event === 'object') {
      const { name, value } = event.target
      setTempLegacy({
        ...tempLegacy, [name]: value,
      })
    } else {
      setTempLegacy({
        ...tempLegacy, [event]: values,
      })
    }
  }

  const handleTabChange = (event, newValue) => {
    setOpenTab(newValue)
  }

  return (
    <>
      <Grid item xs={6}>
        <Typography>
          Enabled
        </Typography>
      </Grid>
      <Grid item xs={6} style={{ textAlign: 'right' }}>
        <Switch
          checked={filters[category].enabled}
          onChange={() => {
            setFilters({
              ...filters,
              [category]: {
                ...filters[category],
                enabled: !filters[category].enabled,
              },
            })
          }}
        />
      </Grid>
      {(filters[category].legacy && context.legacy) ? (
        <>
          <Grid item xs={12}>
            <Typography>
              {Utility.getProperName(specificFilter)} Filter
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <StringFilter
              filterValues={tempLegacy}
              setFilterValues={setTempLegacy}
            />
          </Grid>
        </>
      ) : (
        <>
          <AppBar position="static">
            <Tabs
              value={openTab}
              onChange={handleTabChange}
              indicatorColor="secondary"
              variant="fullWidth"
              style={{ backgroundColor: '#424242' }}
            >
              {Object.keys(context.sliders).map(slider => (
                <Tab label={slider} key={slider} style={{ width: 5, minWidth: 5 }} />
              ))}
            </Tabs>
          </AppBar>
          {Object.keys(context.sliders).map((slider, index) => (
            <TabPanel value={openTab} index={index} key={slider}>
              {Object.values(context.sliders[slider]).map(subItem => (
                <Grid item xs={12} key={subItem.shortName}>
                  <SliderTile
                    filterSlide={subItem}
                    handleChange={handleChange}
                    filterValues={filters[category][specificFilter]}
                  />
                </Grid>
              ))}
            </TabPanel>
          ))}
        </>
      )}
      <Grid item xs={6} style={{ textAlign: 'right' }}>
        <FormControlLabel
          control={(
            <Switch
              checked={filters[category].legacy}
              onChange={handleLegacySwitch}
              name="adv"
              color="secondary"
              disabled={!context.legacy}
            />
          )}
          label="Legacy"
        />
      </Grid>
    </>
  )
}

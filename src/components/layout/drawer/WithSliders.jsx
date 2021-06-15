import React, { useEffect, useState, Fragment } from 'react'
import {
  Grid, Typography, Switch, AppBar, Tab, Tabs, Box,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import { useStore, useStatic } from '@hooks/useStore'
import StringFilter from '../dialogs/filters/StringFilter'
import SliderTile from '../dialogs/filters/SliderTile'

const TabPanel = ({ children, value, index }) => (
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

export default function WithSliders({
  category, filters, setFilters, context, specificFilter,
}) {
  const userSettings = useStore(state => state.userSettings)
  const { t } = useTranslation()
  const [tempLegacy, setTempLegacy] = useState(filters[category][specificFilter])
  const [openTab, setOpenTab] = useState(0)
  const { pokemon } = useStatic(state => state.ui)

  const availableForms = useStatic(state => state.availableForms)
  const { icons } = useStatic(state => state.config)
  const { icons: userIcons } = useStore(state => state.settings)

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
          {t('enabled')}
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
      {(userSettings[category].legacyFilter && context.legacy) ? (
        <>
          <Grid item xs={12}>
            <Typography>
              {t('ivOrFilter')}
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
                <Tab label={t(slider)} key={slider} style={{ width: 5, minWidth: 5 }} />
              ))}
            </Tabs>
          </AppBar>
          {Object.keys(context.sliders).map((slider, index) => (
            <TabPanel value={openTab} index={index} key={slider}>
              {Object.values(context.sliders[slider]).map(subItem => (
                <Grid item xs={12} key={subItem.name}>
                  <SliderTile
                    filterSlide={subItem}
                    handleChange={handleChange}
                    filterValues={filters[category][specificFilter]}
                  />
                </Grid>
              ))}
              {index ? (
                <Grid
                  container
                  item
                  xs={12}
                  direction="row"
                  alignItems="center"
                  justify="center"
                >
                  {['xsRat', 'xlKarp'].map((each, i) => (
                    <Fragment key={each}>
                      <Grid item xs={2}>
                        <img
                          style={{ maxHeight: 30, maxWidth: 30 }}
                          src={`${icons[userIcons].path}/${Utility.getPokemonIcon(availableForms, i ? 129 : 19)}.png`}
                        />
                      </Grid>
                      <Grid item xs={1} className="xs-xl">
                        <Typography
                          variant="subtitle2"
                        >
                          {i ? t('xl').toUpperCase() : t('xs').toUpperCase()}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Switch
                          color="primary"
                          disabled={!pokemon[each]}
                          checked={filters[category][each]}
                          onChange={() => {
                            setFilters({
                              ...filters,
                              [category]: {
                                ...filters[category],
                                [each]: !filters[category][each],
                              },
                            })
                          }}
                        />
                      </Grid>
                    </Fragment>
                  ))}
                </Grid>
              ) : (
                <Grid
                  container
                  item
                  xs={12}
                  direction="row"
                  alignItems="center"
                  justify="center"
                >
                  <Grid item xs={12}>
                    <Typography variant="h6">{t('shortcuts')}</Typography>
                  </Grid>
                  {['zeroIv', 'hundoIv'].map(each => (
                    <Fragment key={each}>
                      <Grid item xs={3}>
                        <Typography>
                          {t(each)}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Switch
                          color="primary"
                          disabled={!pokemon[each]}
                          checked={filters[category][each]}
                          onChange={() => {
                            setFilters({
                              ...filters,
                              [category]: {
                                ...filters[category],
                                [each]: !filters[category][each],
                              },
                            })
                          }}
                        />
                      </Grid>
                    </Fragment>
                  ))}
                </Grid>
              )}
            </TabPanel>
          ))}
        </>
      )}
    </>
  )
}

import React, { useEffect, useState, Fragment } from 'react'
import { Grid, Typography, Switch, AppBar, Tab, Tabs } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import { useStore } from '@hooks/useStore'
import Utility from '@services/Utility'
import StringFilter from '../dialogs/filters/StringFilter'
import SliderTile from '../dialogs/filters/SliderTile'
import TabPanel from '../general/TabPanel'
import GenderFilter from '../dialogs/filters/Gender'

export default function WithSliders({
  category,
  filters,
  setFilters,
  context,
  specificFilter,
}) {
  const userSettings = useStore((state) => state.userSettings)
  const { t } = useTranslation()
  const [tempLegacy, setTempLegacy] = useState(
    filters[category][specificFilter],
  )
  const [openTab, setOpenTab] = useState(0)

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
    if (values) {
      setTempLegacy({
        ...tempLegacy,
        [event]: values,
      })
      Utility.analytics(
        'Global Pokemon',
        `${event}: ${values}`,
        `${category} Text`,
      )
    } else {
      const { name, value } = event.target
      setTempLegacy({
        ...tempLegacy,
        [name]: value,
      })
      Utility.analytics(
        'Global Pokemon',
        `${name}: ${value}`,
        `${category} Sliders`,
      )
    }
  }

  const handleTabChange = (event, newValue) => {
    setOpenTab(newValue)
  }

  return (
    <>
      <Grid item xs={6}>
        <Typography>{t('enabled')}</Typography>
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
      {userSettings[category].legacyFilter && context.legacy ? (
        <>
          <Grid item xs={12}>
            <Typography>{t('iv_or_filter')}</Typography>
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
              {Object.keys(context.sliders).map((slider) => (
                <Tab
                  label={t(slider)}
                  key={slider}
                  style={{ width: 5, minWidth: 5 }}
                />
              ))}
            </Tabs>
          </AppBar>
          {Object.keys(context.sliders).map((slider, index) => (
            <TabPanel value={openTab} index={index} key={slider}>
              {Object.values(context.sliders[slider]).map((subItem) => (
                <Grid item xs={12} key={subItem.name}>
                  <SliderTile
                    filterSlide={subItem}
                    handleChange={handleChange}
                    filterValues={filters[category][specificFilter]}
                  />
                </Grid>
              ))}
              <Grid
                container
                item
                xs={12}
                direction="row"
                alignItems="center"
                justifyContent="center"
                style={{ width: 250 }}
              >
                {index ? (
                  <>
                    {['xxs', 'xxl'].map((each, i) => (
                      <Fragment key={each}>
                        <Grid item xs={3}>
                          <Typography variant="subtitle2" align="center">
                            {t(i ? 'size_5' : 'size_1')}
                          </Typography>
                        </Grid>
                        <Grid item xs={3}>
                          <Switch
                            color="primary"
                            checked={filters[category].ivOr[each]}
                            onChange={() => {
                              setFilters({
                                ...filters,
                                [category]: {
                                  ...filters[category],
                                  ivOr: {
                                    ...filters[category].ivOr,
                                    [each]: !filters[category].ivOr[each],
                                  },
                                },
                              })
                            }}
                          />
                        </Grid>
                      </Fragment>
                    ))}
                    {/* <Divider
                      flexItem
                      style={{ width: '100%', height: 2, margin: '8px 0' }}
                    /> */}
                    {/* {['xsRat', 'xlKarp'].map((each, i) => (
                      <Fragment key={each}>
                        <Grid item xs={2}>
                          <img
                            style={{ maxHeight: 30, maxWidth: 30 }}
                            src={Icons.getPokemon(i ? 129 : 19)}
                            alt={i ? 'Karp' : 'Rat'}
                          />
                        </Grid>
                        <Grid item xs={1}>
                          <Typography variant="subtitle2">
                            {i ? t('xl').toUpperCase() : t('xs').toUpperCase()}
                          </Typography>
                        </Grid>
                        <Grid item xs={3}>
                          <Switch
                            color="primary"
                            disabled={!context[each]}
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
                    ))} */}
                  </>
                ) : (
                  ['zeroIv', 'hundoIv'].map((each) => (
                    <Fragment key={each}>
                      <Grid item xs={3}>
                        <Typography>{t(Utility.camelToSnake(each))}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Switch
                          color="primary"
                          disabled={!context[each]}
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
                  ))
                )}
                {!index && (
                  <Grid
                    container
                    alignItems="center"
                    justifyContent="flex-start"
                    item
                    xs={category ? 12 : 6}
                    style={{ margin: '10px 0' }}
                  >
                    <GenderFilter
                      filter={filters[category].ivOr}
                      setFilter={(newValue) =>
                        setFilters({
                          ...filters,
                          [category]: {
                            ...filters[category],
                            ivOr: {
                              ...filters[category].ivOr,
                              gender: newValue,
                            },
                          },
                        })
                      }
                      category="pokemon"
                    />
                  </Grid>
                )}
              </Grid>
            </TabPanel>
          ))}
        </>
      )}
    </>
  )
}

import React, { useEffect, useState, Fragment } from 'react'
import {
  Grid,
  Typography,
  Switch,
  AppBar,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useStore } from '@hooks/useStore'
import Utility from '@services/Utility'
import StringFilter from '../dialogs/filters/StringFilter'
import SliderTile from '../dialogs/filters/SliderTile'
import TabPanel from '../general/TabPanel'
import MultiSelector from './MultiSelector'

export default function WithSliders({ category, context }) {
  const userSettings = useStore((state) => state.userSettings)
  const filters = useStore((s) => s.filters)
  const { setFilters } = useStore.getState()

  const { t } = useTranslation()
  const [tempLegacy, setTempLegacy] = useState(filters[category].ivOr)
  const [openTab, setOpenTab] = useState(0)

  useEffect(() => {
    setFilters({
      ...filters,
      [category]: {
        ...filters[category],
        ivOr: tempLegacy,
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

  const handleTabChange = (_e, newValue) => setOpenTab(newValue)

  return (
    <>
      <ListItem
        secondaryAction={
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
        }
      >
        <ListItemText primary={t('enabled')} />
      </ListItem>

      {userSettings[category].legacyFilter && context.legacy ? (
        <ListItem
          secondaryAction={
            <StringFilter
              filterValues={tempLegacy}
              setFilterValues={setTempLegacy}
            />
          }
        >
          <ListItemText primary={t('iv_or_filter')} />
        </ListItem>
      ) : (
        <>
          <AppBar position="static">
            <Tabs value={openTab} onChange={handleTabChange}>
              {Object.keys(context.sliders).map((slider) => (
                <Tab label={t(slider)} key={slider} />
              ))}
            </Tabs>
          </AppBar>
          {Object.keys(context.sliders).map((slider, index) => (
            <TabPanel value={openTab} index={index} key={slider}>
              <List>
                {Object.values(context.sliders[slider]).map((subItem) => (
                  <ListItem key={subItem.name} disablePadding>
                    <SliderTile
                      filterSlide={subItem}
                      handleChange={handleChange}
                      filterValues={filters[category].ivOr}
                    />
                  </ListItem>
                ))}
                {index ? (
                  <ListItem>
                    <Grid container alignItems="center">
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
                    </Grid>
                  </ListItem>
                ) : (
                  <>
                    <ListItem>
                      <Grid container alignItems="center">
                        {['zeroIv', 'hundoIv'].map((each) => (
                          <Fragment key={each}>
                            <Grid item xs={3}>
                              <Typography>
                                {t(Utility.camelToSnake(each))}
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
                        ))}
                      </Grid>
                    </ListItem>
                    <ListItem
                      secondaryAction={
                        <MultiSelector
                          filterKey="gender"
                          items={[0, 1, 2, 3]}
                          tKey="gender_icon_"
                          filters={filters[category].ivOr.gender}
                          setFilters={(newValue) =>
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
                        />
                      }
                    >
                      <ListItemText primary={t('gender')} />
                    </ListItem>
                  </>
                )}
              </List>
            </TabPanel>
          ))}
        </>
      )}
    </>
  )
}

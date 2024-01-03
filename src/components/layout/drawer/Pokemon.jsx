/* eslint-disable react/no-unstable-nested-components */
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
  Box,
  IconButton,
  Dialog,
  ButtonGroup,
  Collapse,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { VirtuosoGrid } from 'react-virtuoso'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import TuneIcon from '@mui/icons-material/Tune'
import CheckIcon from '@mui/icons-material/Check'
import ClearIcon from '@mui/icons-material/Clear'

import { useStatic, useStore } from '@hooks/useStore'
import Utility from '@services/Utility'
import StringFilter from '../dialogs/filters/StringFilter'
import SliderTile from '../dialogs/filters/SliderTile'
import TabPanel from '../general/TabPanel'
import MultiSelector from './MultiSelector'
import AdvancedFilter from '../dialogs/filters/Advanced'
import BoolToggle from './BoolToggle'

function AvailableSelector() {
  const available = useStatic((s) => s.available.pokemon)
  const { t } = useTranslation()
  const Icons = useStatic((s) => s.Icons)
  const filters = useStore((s) => s.filters.pokemon)
  const isMobile = useStatic((s) => s.isMobile)

  const [advanced, setAdvanced] = React.useState({
    id: '0',
    standard: filters.standard,
    tempFilters: filters.standard,
  })
  const [open, setOpen] = React.useState(false)

  const onClose = (e, id, filter) => () => {
    if (e !== undefined) {
      useStore.setState((prev) => ({
        filters: {
          ...prev.filters,
          pokemon: {
            ...prev.filters.pokemon,
            filter:
              id === 'global'
                ? Object.fromEntries(
                    Object.entries(prev.filters.pokemon.filter).map(([key]) => [
                      key,
                      { ...filter, enabled: true },
                    ]),
                  )
                : {
                    ...prev.filters.pokemon.filter,
                    [id]: { ...filter, enabled: true },
                  },
          },
        },
      }))
    }
    setAdvanced(filters.standard)
    setOpen(false)
    if (id === 'global') setAll('advanced')
  }

  /**
   *
   * @param {'enable' | 'disable' | 'advanced'} action
   */
  const setAll = (action) => {
    useStore.setState((prev) => ({
      filters: {
        ...prev.filters,
        pokemon: {
          ...prev.filters.pokemon,
          filter: Object.fromEntries(
            Object.entries(prev.filters.pokemon.filter).map(([key, value]) => {
              const enabled = action !== 'disable'
              const all = action === 'enable'
              return [key, { ...value, enabled, all }]
            }),
          ),
        },
      },
    }))
  }

  const items = React.useMemo(
    () =>
      filters.onlyShowAvailable
        ? available
        : Object.keys(filters.filter).filter((key) => key !== 'global'),
    [filters.onlyShowAvailable, filters.filter, available],
  )

  return (
    <List>
      <BoolToggle
        field="filters.pokemon.onlyShowAvailable"
        label="only_show_available"
      />
      <ListItem>
        <ListItemText>{t('set_all')}</ListItemText>
        <ButtonGroup variant="text" size="small" color="warning">
          <IconButton color="success" onClick={() => setAll('enable')}>
            <CheckIcon />
          </IconButton>
          <Collapse in={!filters.easyMode} orientation="horizontal">
            <IconButton
              color="info"
              onClick={() => {
                setAdvanced((prev) => ({
                  ...prev,
                  id: 'global',
                  tempFilters: filters.filter.global,
                }))
                setOpen(true)
              }}
            >
              <TuneIcon />
            </IconButton>
          </Collapse>
          <IconButton color="error" onClick={() => setAll('disable')}>
            <ClearIcon />
          </IconButton>
        </ButtonGroup>
      </ListItem>
      <VirtuosoGrid
        style={{ height: 400, width: 292 }}
        totalCount={items.length}
        overscan={5}
        data={items}
        components={{
          Item: (props) => <Grid2 xs={4} {...props} />,
          List: React.forwardRef((props, ref) => (
            <Grid2 {...props} container ref={ref} />
          )),
        }}
        context={{ Icons, t, filters }}
        itemContent={(_, key, ctx) => {
          const [pokemon, form] = key.split('-', 2)
          const url = ctx.Icons.getPokemon(pokemon, form)
          const bgcolor = filters.filter[key]?.enabled
            ? filters.filter[key]?.all || filters.easyMode
              ? 'success.main'
              : 'info.main'
            : 'error.dark'
          return (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              position="relative"
              outline="ButtonText 1px solid"
              sx={{ aspectRatio: '1/1' }}
              onClick={() => {
                const filter = { ...filters.filter[key] }
                if (filter.all) {
                  filter.all = false
                  filter.enabled = !filters.easyMode
                } else if (filter.enabled) {
                  filter.enabled = false
                } else {
                  filter.all = true
                  filter.enabled = true
                }
                useStore.setState((prev) => ({
                  filters: {
                    ...prev.filters,
                    pokemon: {
                      ...prev.filters.pokemon,
                      filter: {
                        ...prev.filters.pokemon.filter,
                        [key]: filter,
                      },
                    },
                  },
                }))
              }}
            >
              <Box
                height="100%"
                width="100%"
                bgcolor={bgcolor}
                position="absolute"
                top={0}
                left={0}
                sx={{ opacity: 0.4 }}
              />
              <img
                alt={url}
                src={url}
                style={{
                  maxHeight: 50,
                  maxWidth: 50,
                  zIndex: 10,
                }}
              />
              <Collapse in={!filters.easyMode}>
                <IconButton
                  size="small"
                  sx={{ position: 'absolute', right: 0, top: 0 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setAdvanced((prev) => ({
                      ...prev,
                      id: key,
                      tempFilters: filters.filter[key],
                    }))
                    setOpen(true)
                  }}
                >
                  <TuneIcon fontSize="small" />
                </IconButton>
              </Collapse>
            </Box>
          )
        }}
      />
      <Dialog open={open} onClose={onClose()} fullScreen={isMobile}>
        <AdvancedFilter
          advancedFilter={advanced}
          toggleAdvMenu={onClose}
          type="pokemon"
          isMobile={isMobile}
        />
      </Dialog>
    </List>
  )
}

const MemoAvailableSelector = React.memo(AvailableSelector, () => true)

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
      <BoolToggle field="filters.pokemon.enabled" label="enabled" />
      <BoolToggle field="filters.pokemon.easyMode" label="easy_mode" />
      <Collapse in={!filters.pokemon.easyMode}>
        <BoolToggle
          field="userSettings.pokemon.linkGlobalAndAdvanced"
          label="global_respects_selected"
        />
      </Collapse>
      {userSettings[category].legacyFilter && context.legacy ? (
        <ListItem>
          <StringFilter
            filterValues={tempLegacy}
            setFilterValues={setTempLegacy}
          />
        </ListItem>
      ) : (
        <>
          <AppBar position="static">
            <Tabs value={openTab} onChange={handleTabChange}>
              <Tab label={t('main')} />
              <Tab label={t('extra')} />
              <Tab label={t('select')} />
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
                  <ListItem disablePadding>
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
                    <ListItem disablePadding>
                      <Grid container alignItems="center">
                        {['zeroIv', 'hundoIv'].map((each) => (
                          <Fragment key={each}>
                            <Grid item xs={3}>
                              <Typography noWrap>
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
                    <ListItem disablePadding sx={{ pt: 2, pr: 1 }}>
                      <ListItemText primary={t('gender')} />
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
                    </ListItem>
                  </>
                )}
              </List>
            </TabPanel>
          ))}
          <TabPanel value={openTab} index={2} disablePadding>
            <MemoAvailableSelector />
          </TabPanel>
        </>
      )}
    </>
  )
}

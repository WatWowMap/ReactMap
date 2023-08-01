import React, { Fragment, useState, useEffect } from 'react'
import {
  Select,
  Typography,
  Grid,
  DialogContent,
  MenuItem,
  Switch,
  FormControl,
  InputLabel,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import { useStore, useStatic } from '@hooks/useStore'

import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'
import StringFilter from './StringFilter'
import SliderTile from './SliderTile'
import Size from './Size'
import QuestTitle from '../../general/QuestTitle'
import GenderFilter from './Gender'

export default function AdvancedFilter({
  toggleAdvMenu,
  advancedFilter,
  type,
  isTutorial,
  isMobile,
}) {
  Utility.analytics(`/${type}/${advancedFilter.id}`)

  const ui = useStatic((state) => state.ui)
  const { questConditions = {} } = useStatic((state) => state.available)
  const [filterValues, setFilterValues] = useState(advancedFilter.tempFilters)
  const filters = useStore((state) => state.filters)
  const userSettings = useStore((state) => state.userSettings)
  const { t } = useTranslation()

  Utility.analytics(
    'Advanced Filtering',
    `ID: ${advancedFilter.id} Size: ${filterValues.size}`,
    type,
  )
  if (isTutorial) {
    ui.pokemon = isTutorial
  }

  const handleChange = (event, values) => {
    if (values) {
      if (event === 'default') {
        setFilterValues({ ...values, enabled: filterValues.enabled })
      } else {
        setFilterValues({ ...filterValues, [event]: values })
      }
    } else {
      const { name, value } = event.target
      setFilterValues({
        ...filterValues,
        [name]:
          Array.isArray(value) && type === 'pokestops'
            ? value.filter(Boolean).join(',')
            : value,
      })
    }
  }

  const footerOptions = [
    {
      name: 'reset',
      action: () =>
        handleChange(
          'default',
          advancedFilter.standard || { enabled: false, size: 'md' },
        ),
      color: 'primary',
      size: type === 'pokemon' ? 2 : null,
    },
    {
      name: 'save',
      action: toggleAdvMenu(false, advancedFilter.id, filterValues),
      color: 'secondary',
      size: type === 'pokemon' ? 3 : null,
    },
  ]

  if (type === 'pokemon') {
    footerOptions.unshift({
      key: 'size',
      component: (
        <Size
          filterValues={filterValues}
          handleChange={handleChange}
          btnSize="medium"
        />
      ),
      size: 7,
    })
  }

  // Provides a reset if that condition is no longer available
  useEffect(() => {
    if (type === 'pokestops' && ui.pokestops?.quests) {
      if (!questConditions[advancedFilter.id] && filterValues.adv) {
        setFilterValues({ ...filterValues, adv: '' })
      } else {
        const filtered = filterValues.adv
          .split(',')
          .filter((each) =>
            questConditions[advancedFilter.id].find(
              ({ title }) => title === each,
            ),
          )
        setFilterValues({
          ...filterValues,
          adv: filtered.length ? filtered.join(',') : '',
        })
      }
    }
  }, [])

  return advancedFilter.id ? (
    <>
      <Header
        titles={[
          type === 'pokemon' ||
          (!advancedFilter.id.startsWith('l') &&
            !advancedFilter.id.startsWith('i'))
            ? t('advanced')
            : t('set_size'),
        ]}
        action={toggleAdvMenu(false, type, filters.filter)}
      />
      <DialogContent>
        {type === 'pokemon' ? (
          <Grid
            container
            direction="row"
            justifyContent="center"
            alignItems="center"
            style={{ marginTop: 10 }}
            spacing={1}
          >
            {userSettings[type].legacyFilter && ui[type].legacy ? (
              <Grid item xs={12}>
                <StringFilter
                  filterValues={filterValues}
                  setFilterValues={setFilterValues}
                />
              </Grid>
            ) : (
              <>
                {Object.entries(ui[type].sliders).map(([category, sliders]) => (
                  <Grid item xs={12} sm={6} key={category}>
                    {sliders.map((each) => (
                      <SliderTile
                        key={each.name}
                        filterSlide={each}
                        handleChange={handleChange}
                        filterValues={filterValues}
                      />
                    ))}
                  </Grid>
                ))}
                <Grid
                  container
                  item
                  xs={12}
                  style={{ marginTop: 5, marginBottom: 20 }}
                >
                  <GenderFilter
                    filter={filterValues}
                    setFilter={(newValue) =>
                      setFilterValues({
                        ...filterValues,
                        gender: newValue,
                      })
                    }
                  />
                  <Grid
                    container
                    item
                    xs={12}
                    sm={6}
                    justifyContent="center"
                    alignItems="center"
                    style={{
                      marginTop: isMobile ? 20 : undefined,
                    }}
                  >
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
                            checked={filterValues[each]}
                            onChange={() => {
                              setFilterValues({
                                ...filterValues,
                                [each]: !filterValues[each],
                              })
                            }}
                          />
                        </Grid>
                      </Fragment>
                    ))}
                  </Grid>
                </Grid>
              </>
            )}
          </Grid>
        ) : (
          <Grid item xs={12} sx={{ textAlign: 'center', mt: 2 }}>
            <Size
              filterValues={filterValues}
              handleChange={handleChange}
              btnSize="medium"
            />
          </Grid>
        )}
        {type === 'pokestops' &&
          ui.pokestops?.quests &&
          questConditions?.[advancedFilter.id] && (
            <Grid
              item
              xs={12}
              style={{
                textAlign: 'center',
                marginTop: 10,
                marginBottom: 10,
                maxWidth: 200,
              }}
            >
              <FormControl
                variant="outlined"
                size="small"
                fullWidth
                sx={{ my: 1 }}
              >
                <InputLabel>{t('quest_condition')}</InputLabel>
                <Select
                  name="adv"
                  value={(filterValues.adv || '').split(',')}
                  fullWidth
                  multiple
                  renderValue={(selected) =>
                    Array.isArray(selected)
                      ? `${selected.length} ${t('selected')}`
                      : selected
                  }
                  size="small"
                  label={t('quest_condition')}
                  onChange={(e, child) => {
                    if (child.props.value === '') {
                      return setFilterValues((prev) => ({ ...prev, adv: '' }))
                    }
                    return handleChange(e)
                  }}
                >
                  <MenuItem value="">
                    <Typography variant="caption">{t('all')}</Typography>
                  </MenuItem>
                  {questConditions[advancedFilter.id]
                    .slice()
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map(({ title, target }) => (
                      <MenuItem key={`${title}-${target}`} value={title}>
                        <QuestTitle questTitle={title} questTarget={target} />
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
          )}
      </DialogContent>
      <Footer options={footerOptions} />
    </>
  ) : null
}

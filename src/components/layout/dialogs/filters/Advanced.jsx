import React, { useState, useEffect } from 'react'
import { Select, Typography, Grid, DialogContent, MenuItem } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import { useStore, useStatic } from '@hooks/useStore'

import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'
import StringFilter from './StringFilter'
import SliderTile from './SliderTile'
import Size from './Size'
import QuestTitle from '../../general/QuestTitle'

export default function AdvancedFilter({
  toggleAdvMenu, advancedFilter, type, isTutorial,
}) {
  Utility.analytics(`/${type}/${advancedFilter.id}`)

  const ui = useStatic(state => state.ui)
  const { questConditions } = useStatic(state => state.available)
  const [filterValues, setFilterValues] = useState(advancedFilter.tempFilters)
  const filters = useStore(state => state.filters)
  const userSettings = useStore(state => state.userSettings)
  const { t } = useTranslation()

  Utility.analytics('Advanced Filtering', `ID: ${advancedFilter.id} Size: ${filterValues.size}`, type)
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
      setFilterValues({ ...filterValues, [name]: value })
    }
  }

  const footerOptions = [
    { name: 'reset', action: () => handleChange('default', advancedFilter.standard || { enabled: false, size: 'md' }), color: 'primary', size: type === 'pokemon' ? 2 : null },
    { name: 'save', action: toggleAdvMenu(false, advancedFilter.id, filterValues), color: 'secondary', size: type === 'pokemon' ? 3 : null },
  ]

  if (type === 'pokemon') {
    footerOptions.unshift(
      {
        key: 'size',
        component: <Size
          filterValues={filterValues}
          handleChange={handleChange}
          btnSize="medium"
        />,
        size: 7,
      },
    )
  }

  // Provides a reset if that condition is no longer available
  useEffect(() => {
    if (type === 'pokestops' && ui.pokestops?.quests) {
      if (!questConditions && filterValues.adv) {
        setFilterValues({ ...filterValues, adv: '' })
      } else if (questConditions
        && (!questConditions[advancedFilter.id]
          || questConditions[advancedFilter.id].every(cond => cond.title !== filterValues.adv))) {
        setFilterValues({ ...filterValues, adv: '' })
      }
    }
  }, [])

  return (
    <>
      <Header
        titles={[type === 'pokemon' ? t('advanced') : t('set_size')]}
        action={toggleAdvMenu(false, type, filters.filter)}
      />
      <DialogContent style={{ color: 'white' }}>
        {type === 'pokemon' ? (
          <Grid
            container
            direction="row"
            justifyContent="center"
            alignItems="center"
            style={{ marginTop: 10 }}
            spacing={1}
          >
            {(userSettings[type].legacyFilter && ui[type].legacy)
              ? (
                <Grid item xs={12}>
                  <StringFilter
                    filterValues={filterValues}
                    setFilterValues={setFilterValues}
                  />
                </Grid>
              )
              : Object.entries(ui[type].sliders).map(([category, sliders]) => (
                <Grid item xs={12} sm={6} key={category}>
                  {sliders.map(each => (
                    <SliderTile
                      key={each.name}
                      filterSlide={each}
                      handleChange={handleChange}
                      filterValues={filterValues}
                    />
                  ))}
                </Grid>
              ))}
          </Grid>
        ) : (
          <Grid item xs={12} style={{ textAlign: 'center' }}>
            <Size
              filterValues={filterValues}
              handleChange={handleChange}
              btnSize="medium"
            />
          </Grid>
        )}
        {(type === 'pokestops' && ui.pokestops?.quests && questConditions?.[advancedFilter.id]) && (
          <Grid item xs={12} style={{ textAlign: 'center', marginTop: 10, marginBottom: 10 }}>
            <Select name="adv" value={filterValues.adv || ''} fullWidth onChange={(e) => handleChange(e)}>
              <MenuItem value=""><Typography variant="caption">{t('all')}</Typography></MenuItem>
              {questConditions?.[advancedFilter.id].map(({ title, target }) => (
                <MenuItem key={`${title}-${target}`} value={title}><QuestTitle questTitle={title} questTarget={target} /></MenuItem>
              ))}
            </Select>
          </Grid>
        )}
      </DialogContent>
      <Footer options={footerOptions} />
    </>
  )
}

import React, { Fragment, useState } from 'react'
import {
  Grid,
  DialogContent,
  Switch,
  Typography,
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@material-ui/core'
import { ExpandMore } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import useStyles from '@hooks/useStyles'
import { useStore, useStatic } from '@hooks/useStore'
import SliderTile from '@components/layout/dialogs/filters/SliderTile'
import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'

const convertToReactMap = (values) => {
  const reactMapFriendly = {}
  Object.keys(values).forEach(key => {
    if (key.startsWith('min')) {
      const trim = key.replace('min_', '')
      reactMapFriendly[trim] = [values[`min_${trim}`], values[`max_${trim}`]]
    } else if (key.startsWith('max')) {
      // do nothing, handled above
    } else if (key.startsWith('pvp')) {
      reactMapFriendly.pvp = [values.pvp_ranking_best, values.pvp_ranking_worst]
    } else if (key === 'atk' || key === 'def' || key === 'sta') {
      reactMapFriendly[`${key}_iv`] = [values[key], values[`max_${key}`]]
    } else if (key.startsWith('rarity')) {
      reactMapFriendly.rarity = [values[key], values[`max_${key}`]]
    } else {
      reactMapFriendly[key] = values[key]
    }
  })
  return reactMapFriendly
}

const skipFields = ['profile_no', 'allForms', 'pvpEntry', 'noIv', 'byDistance', 'distance', 'xs', 'xl', 'clean', 'gender', 'description', 'great_league_ranking', 'great_league_ranking_min_cp', 'ultra_league_ranking', 'ultra_league_ranking_min_cp', 'uid', 'id', 'ping', 'pokemon_id', 'form', '__typename']

export default function WebhookAdvanced({
  category, id, toggleWebhook, tempFilters, isMobile,
}) {
  const [pokemonId, form] = id.split('-')
  const { t } = useTranslation()
  const classes = useStyles()
  const selectedWebhook = useStore(s => s.selectedWebhook)
  const webhookAdv = useStore(s => s.webhookAdv)
  const setWebhookAdv = useStore(s => s.setWebhookAdv)
  const { [selectedWebhook]: {
    info: { [category]: info }, profile, human, template, platform, config, leagues, pvp,
  } } = useStatic(s => s.webhookData)
  const { pokemon: { [pokemonId]: { weight } } } = useStatic(s => s.masterfile)

  const [filterValues, setFilterValues] = useState(tempFilters?.template
    ? convertToReactMap(tempFilters)
    : { ...convertToReactMap(info.defaults), profile_no: human.current_profile_no })
  const [poracleValues, setPoracleValues] = useState(tempFilters?.template
    ? tempFilters
    : { ...info.defaults, profile_no: human.current_profile_no })

  const handleSlider = (event, values, low, high) => {
    setFilterValues({ ...filterValues, [event]: values })
    setPoracleValues({ ...poracleValues, [low]: values[0], [high]: values[1] })
  }

  const handleSwitch = (event) => {
    const { name, checked } = event.target
    switch (name) {
      case 'xl':
        setPoracleValues({
          ...poracleValues,
          min_weight: checked ? Math.ceil(weight * 1.313) : info.defaults.min_weight,
          max_weight: info.defaults.max_weight,
          [name]: checked,
          xs: false,
        }); break
      case 'xs':
        setPoracleValues({
          ...poracleValues,
          min_weight: info.defaults.min_weight,
          max_weight: checked ? Math.floor(weight / 1.6431924) : info.defaults.max_weight,
          [name]: checked,
          xl: false,
        }); break
      case 'noIv':
        setPoracleValues({
          ...poracleValues,
          [name]: checked,
          pvpEntry: false,
        }); break
      case 'pvpEntry':
        setPoracleValues({
          ...poracleValues,
          [name]: checked,
          noIv: false,
        }); break
      default: setPoracleValues({ ...poracleValues, [name]: checked })
    }
  }

  const handleSelect = (event) => {
    const { name, value } = event.target
    const newObj = { [name]: value }
    if (name === 'pvp_ranking_league') {
      newObj.pvp_ranking_min_cp = pvp === 'ohbem' ? 0 : value - 50
    }
    setPoracleValues({ ...poracleValues, ...newObj })
  }

  const handleChange = (panel) => (event, isExpanded) => {
    setWebhookAdv({ ...webhookAdv, [panel]: isExpanded })
  }

  const footerOptions = [
    { name: 'save', action: toggleWebhook(false, id, poracleValues), icon: 'Save' },
  ]

  const getOptions = (option) => {
    const menuItems = []
    switch (option.name) {
      case 'template': template[platform][poracleValues.noIv ? `${category}NoIv` : category].en.forEach(item => (
        menuItems.push(<MenuItem key={item} value={item}>{item}</MenuItem>)
      )); break
      case 'profile_no': profile.forEach(pro => (
        menuItems.push(<MenuItem key={pro.name} value={pro.profile_no}>{pro.name}</MenuItem>)
      )); break
      case 'pvp_ranking_league': option.options.forEach(league => (
        menuItems.push(<MenuItem key={league.name} value={league.cp}>{t(`${league.name}Slider`)}</MenuItem>)
      )); break
      case 'gender': option.options.forEach(gender => (
        menuItems.push(<MenuItem key={gender} value={gender}>{t(`gender_${gender}`)}</MenuItem>)
      )); break
      default: option.options.forEach(subOption => (
        menuItems.push(<MenuItem key={subOption} value={subOption}>{t(subOption, subOption)}</MenuItem>)
      ))
    }
    return menuItems
  }

  const checkDefaults = (field) => {
    if (field === 'distance' && parseInt(poracleValues.distance)) return `d${poracleValues.distance}`
    if (field === 'min_time' && parseInt(poracleValues.min_time)) return `t${poracleValues.min_time}`
    if (skipFields.includes(field)) return ''
    if (field.startsWith('pvp')) {
      if (poracleValues.pvpEntry) {
        const league = leagues.find(x => x.cp === poracleValues.pvp_ranking_league)
        switch (field) {
          case 'pvp_ranking_min_cp':
            return pvp === 'ohbem' ? '' : `${league.name}cp${poracleValues.pvp_ranking_min_cp}`
          case 'pvp_ranking_worst':
            return `${league.name}high${poracleValues.pvp_ranking_worst}`
          case 'pvp_ranking_best':
            return `${league.name}${poracleValues.pvp_ranking_best}`
          default: return ''
        }
      }
      return ''
    }
    if (!poracleValues.pvpEntry) {
      return poracleValues[field] === info.defaults[field] ? '' : `${field.replace(/_/g, '')}${poracleValues[field]}`
    }
  }

  const getPoracleString = () => {
    switch (category) {
      default: return `${config.prefix}track 
      ${t(`poke_${pokemonId}`).toLowerCase()} 
      ${!poracleValues.allForms && +form ? `form:${t(`form_${form}`).toLowerCase().replace(/ /g, '_')}` : ''} 
      ${poracleValues.noIv ? '' : Object.keys(poracleValues).map(checkDefaults).join(' ')}
      ${poracleValues.gender ? ` ${t(`gender_${poracleValues.gender}`).toLowerCase()}` : ''}
      ${poracleValues.clean ? ' clean' : ''}`
    }
  }

  const getInputs = (type, options, parent) => {
    const size = Math.floor(12 / options.length)
    switch (type) {
      case 'sliders': return options.map((option, i) => (
        <Grid key={option.name} item xs={12} sm={option.size || 6} style={isMobile ? { marginTop: i ? 'inherit' : 10 } : {}}>
          <SliderTile
            filterSlide={option}
            handleChange={handleSlider}
            filterValues={filterValues}
          />
        </Grid>
      ))
      case 'selects': return options.map(option => (
        <Grid key={option.name} item xs={option.xs || 6} sm={option.sm || size} style={{ margin: '10px 0', textAlign: 'center' }}>
          <FormControl variant="outlined" size="small">
            <InputLabel>{t(option.name)}</InputLabel>
            <Select
              autoFocus
              name={option.name}
              value={poracleValues[option.name]}
              onChange={handleSelect}
              label={t(option.name)}
            >
              {getOptions(option)}
            </Select>
          </FormControl>
        </Grid>
      ))
      case 'booleans': return options.map(option => (
        <Grid
          key={option.name}
          container
          item
          xs={option.xs || 6}
          sm={option.sm || size}
          justifyContent="center"
          alignItems="center"
          direction={isMobile || option.override ? 'row' : 'column'}
          style={{ margin: '10px 0' }}
        >
          <Grid item xs={6} style={{ textAlign: 'center' }}>
            <Typography variant="subtitle2">
              {t(option.name)}
            </Typography>
          </Grid>
          <Grid item xs={6} style={{ textAlign: 'center' }}>
            <Switch
              name={option.name}
              color="primary"
              onChange={handleSwitch}
              checked={Boolean(poracleValues[option.name])}
            />
          </Grid>
        </Grid>
      ))
      case 'texts': return options.map(option => (
        <Grid key={option.name} item xs={option.xs || 6} sm={option.sm || size} style={{ margin: '10px 0', textAlign: 'center' }}>
          <TextField
            autoComplete="off"
            name={option.name}
            label={t(option.name)}
            value={poracleValues[option.name]}
            onChange={handleSelect}
            variant="outlined"
            disabled={option.name === 'distance' ? !poracleValues.byDistance : option.disabled}
            type={option.type || 'text'}
            size="small"
            style={{ width: 90 }}
            inputProps={{
              min: 0,
              max: option.max,
            }}
          />
        </Grid>
      ))
      // Recursive for nested props
      default: return (
        <Grid
          key={type}
          container
          item
          xs={12}
          justifyContent="center"
          alignItems="center"
        >
          <Divider light flexItem style={{ height: 3, width: '90%', margin: '10px 0' }} />
          {Object.keys(info.ui[parent][type]).map(subType => (
            getInputs(subType, info.ui[parent][type][subType], type)
          ))}
        </Grid>
      )
    }
  }
  return (
    <>
      <Header
        titles={[`poke_${pokemonId}`, +form ? `form_${form}` : '']}
        action={toggleWebhook(false, id)}
      />
      <DialogContent style={{ color: 'white', padding: '8px 5px' }}>
        {Object.keys(info.ui).map(type => {
          const Items = (
            <Grid
              container
              justifyContent="center"
              alignItems="center"
            >
              {Object.keys(info.ui[type]).map(subType => (getInputs(subType, info.ui[type][subType], type)))}
            </Grid>
          )
          return (
            <Paper style={{ margin: 10, width: '95%' }} elevation={3} key={type}>
              {(type === 'general' || type === 'distanceOrArea') ? Items : (
                <Accordion
                  expanded={webhookAdv[type]}
                  onChange={handleChange(type)}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore style={{ color: 'white' }} />}
                  >
                    <Typography className={classes.heading}>
                      {t(type)}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {Items}
                  </AccordionDetails>
                </Accordion>
              )}
            </Paper>
          )
        })}
        <Paper style={{ margin: 10, width: '95%', textAlign: 'center' }} elevation={1}>
          <Typography variant="subtitle1" color="secondary">
            {getPoracleString()}
          </Typography>
        </Paper>
      </DialogContent>
      <Footer options={footerOptions} role="webhookAdvanced" />
    </>
  )
}

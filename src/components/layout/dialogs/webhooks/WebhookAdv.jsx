/* eslint-disable react/jsx-no-duplicate-props */
import React, { useState } from 'react'
import ExpandMore from '@material-ui/icons/ExpandMore'
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
  InputAdornment,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  CircularProgress,
} from '@material-ui/core'

import { Autocomplete } from '@material-ui/lab'
import { Trans, useTranslation } from 'react-i18next'
import { useLazyQuery } from '@apollo/client'

import useStyles from '@hooks/useStyles'
import { useStore, useStatic } from '@hooks/useStore'

import Query from '@services/Query'
import Utility from '@services/Utility'
import Poracle from '@services/Poracle'

import SliderTile from '@components/layout/dialogs/filters/SliderTile'
import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'

const skipFields = [
  'profile_no',
  'allForms',
  'pvpEntry',
  'noIv',
  'byDistance',
  'distance',
  'xs',
  'xl',
  'clean',
  'gender',
  'description',
  'uid',
  'max_size',
  'id',
  'ping',
  'pokemon_id',
  'form',
  '__typename',
  'allMoves',
  'enabled',
  'level',
  'exclusive',
  'lure_id',
  'reward',
  'reward_type',
  'grunt_type',
  'grunt_id',
  'gym_id',
  'slot_changes',
  'team',
  'battle_changes',
  'shiny',
  'everything_individually',
]

export default function WebhookAdvanced({
  category,
  id,
  toggleWebhook,
  tempFilters,
  isMobile,
}) {
  const idObj = Poracle.getIdObj(id)
  const { t } = useTranslation()
  const classes = useStyles()
  const location = useStore((state) => state.location)
  const selectedWebhook = useStore((s) => s.selectedWebhook)
  const webhookAdv = useStore((s) => s.webhookAdv)
  const setWebhookAdv = useStore((s) => s.setWebhookAdv)
  const {
    [selectedWebhook]: {
      info: { [category]: info },
      profile,
      human,
      templates,
      prefix,
      leagues,
      pvp,
      addressFormat,
      hasNominatim,
      locale,
      everything,
    },
  } = useStatic((s) => s.webhookData)
  const { pokemon, moves, types } = useStatic((s) => s.masterfile)

  Utility.analytics(`/poracle/${category}`)

  const [search, { data, previousData, loading }] = useLazyQuery(
    Query.search('webhook'),
    {
      variables: {
        search: '',
        category: '',
        lat: location[0],
        lon: location[1],
        locale: localStorage.getItem('i18nextLng'),
        webhookName: selectedWebhook,
      },
    },
  )
  const fetchedData = data || previousData
  const [filterValues, setFilterValues] = useState(
    tempFilters?.template
      ? Poracle.reactMapFriendly(tempFilters)
      : {
          ...Poracle.reactMapFriendly(info.defaults),
          profile_no: human.current_profile_no,
        },
  )
  const [poracleValues, setPoracleValues] = useState(
    tempFilters?.template
      ? tempFilters
      : { ...info.defaults, profile_no: human.current_profile_no },
  )

  const handleSlider = (event, values, low, high) => {
    setFilterValues({ ...filterValues, [event]: values })
    setPoracleValues({
      ...poracleValues,
      [low]: values[0],
      [high]: values[1],
      pvpEntry: event.startsWith('pvp'),
    })
  }

  const handleSwitch = (event) => {
    const { name, checked } = event.target
    switch (name) {
      case 'xl':
        setPoracleValues({
          ...poracleValues,
          min_weight: checked
            ? Math.ceil(pokemon[idObj.id].weight * 1.313)
            : info.defaults.min_weight,
          max_weight: info.defaults.max_weight,
          [name]: checked,
          xs: false,
        })
        break
      case 'xs':
        setPoracleValues({
          ...poracleValues,
          min_weight: info.defaults.min_weight,
          max_weight: checked
            ? Math.floor(pokemon[idObj.id].weight / 1.6431924)
            : info.defaults.max_weight,
          [name]: checked,
          xl: false,
        })
        break
      case 'noIv':
        setPoracleValues({
          ...poracleValues,
          [name]: checked,
          pvpEntry: false,
        })
        break
      case 'pvpEntry':
        setPoracleValues({
          ...poracleValues,
          [name]: checked,
          noIv: false,
        })
        break
      case 'allMoves':
        setPoracleValues({
          ...poracleValues,
          [name]: checked,
          move: 9000,
        })
        break
      case 'byDistance':
        setPoracleValues({
          ...poracleValues,
          [name]: checked,
          distance: 0,
        })
        break
      default:
        setPoracleValues({ ...poracleValues, [name]: checked })
    }
  }

  const handleSelect = (event) => {
    const { name, value } = event.target
    const newObj = { [name]: value }
    if (name === 'pvp_ranking_league') {
      newObj.pvp_ranking_min_cp = pvp === 'ohbem' ? 0 : value - 50
    }
    if (name.startsWith('pvp')) {
      newObj.pvpEntry = true
    }
    if (name === 'move' && value !== 9000) {
      newObj.allMoves = false
    }
    if (name === 'template') {
      newObj[name] = value?.toString() || ''
    }
    setPoracleValues({ ...poracleValues, ...newObj })
  }

  const handleChange = (panel) => (event, isExpanded) => {
    setWebhookAdv({ ...webhookAdv, [panel]: isExpanded })
  }

  const footerOptions = [
    {
      name: 'save',
      action: toggleWebhook(false, id, poracleValues),
      icon: 'Save',
    },
  ]

  const getOptions = (option) => {
    const menuItems = []
    switch (option.name) {
      case 'template':
        templates[poracleValues.noIv ? `${category}NoIv` : category]?.[
          locale
        ]?.forEach((item) =>
          menuItems.push(
            <MenuItem key={item} value={item} dense>
              {item}
            </MenuItem>,
          ),
        )
        break
      case 'profile_no':
        if (profile.length) {
          profile.forEach((pro) =>
            menuItems.push(
              <MenuItem key={pro.name} value={pro.profile_no} dense>
                {pro.name}
              </MenuItem>,
            ),
          )
        } else {
          menuItems.push(
            <MenuItem key={1} value={1} dense>
              1
            </MenuItem>,
          )
        }
        break
      case 'pvp_ranking_cap':
        option.options.forEach((subOption) =>
          menuItems.push(
            <MenuItem key={subOption} value={subOption} dense>
              {subOption ? t(subOption, subOption) : t('all')}
            </MenuItem>,
          ),
        )
        break
      case 'pvp_ranking_league':
        option.options.forEach((league) =>
          menuItems.push(
            <MenuItem key={league.name} value={league.cp} dense>
              {t(`slider_${league.name}`)}
            </MenuItem>,
          ),
        )
        break
      case 'gender':
        option.options.forEach((gender) =>
          menuItems.push(
            <MenuItem key={gender} value={gender} dense>
              {t(`gender_${gender}`)}
            </MenuItem>,
          ),
        )
        break
      case 'team':
        option.options.forEach((team) =>
          menuItems.push(
            <MenuItem key={team} value={team} dense>
              {t(`team_${team}`, t('any'))}
            </MenuItem>,
          ),
        )
        break
      case 'move':
        menuItems.push(
          <MenuItem key={9000} value={9000} dense>
            {t('any')}
          </MenuItem>,
        )
        if (id === 'global') {
          Object.keys(moves).forEach((move) => {
            if (moves[move].type) {
              menuItems.push(
                <MenuItem key={move} value={move} dense>
                  {t(`move_${move}`)}
                </MenuItem>,
              )
            }
          })
        } else if (pokemon[idObj.id]) {
          ;['quickMoves', 'chargedMoves'].forEach((moveType) => {
            if (pokemon[idObj.id]?.forms?.[idObj.form]?.[moveType]) {
              pokemon[idObj.id]?.forms?.[idObj.form]?.[moveType].forEach(
                (move) => {
                  menuItems.push(
                    <MenuItem key={move} value={move} dense>
                      {t(`move_${move}`)}
                    </MenuItem>,
                  )
                },
              )
            } else if (pokemon[idObj.id][moveType]) {
              pokemon[idObj.id][moveType].forEach((move) => {
                menuItems.push(
                  <MenuItem key={move} value={move} dense>
                    {t(`move_${move}`)}
                  </MenuItem>,
                )
              })
            }
          })
        }
        break
      default:
        option.options.forEach((subOption) =>
          menuItems.push(
            <MenuItem key={subOption} value={subOption} dense>
              {t(subOption, subOption)}
            </MenuItem>,
          ),
        )
    }
    return menuItems
  }

  const checkDefaults = (field) => {
    if (
      field === 'size' &&
      (poracleValues.size > 1 || poracleValues.max_size < 5)
    )
      return poracleValues.size === poracleValues.max_size
        ? `size:${t(`size_${poracleValues.size}`)}`
        : `size:${t(`size_${poracleValues.size}`)}-${t(
            `size_${poracleValues.max_size}`,
          )}`

    if (
      field === 'distance' &&
      poracleValues.byDistance &&
      +poracleValues.distance
    )
      return `d${poracleValues.distance}`
    if (field === 'min_time' && parseInt(poracleValues.min_time))
      return `t${poracleValues.min_time}`
    if (field === 'exclusive' && poracleValues.exclusive)
      return ` ${t('exclusive')} `
    if (field === 'clean' && poracleValues.clean) return ` ${t('clean')} `
    if (field === 'min_spawn_avg' && poracleValues.min_spawn_avg > 0)
      return ` ${t('minspawn')}${poracleValues.min_spawn_avg} `
    if (field === 'slot_changes' && poracleValues.slot_changes)
      return ` ${t('slot_changes_poracle')} `
    if (field === 'battle_changes' && poracleValues.battle_changes)
      return ` ${t('battle_changes_poracle')} `
    if (field === 'team' && poracleValues.team !== 4)
      return t(`team_${poracleValues.team}`)
    if (
      field === 'everything_individually' &&
      poracleValues.everything_individually
    )
      return ` ${t('individually')} `
    if (skipFields.includes(field)) return ''
    if (field.startsWith('pvp')) {
      if (
        poracleValues.pvpEntry &&
        poracleValues.pvp_ranking_league &&
        poracleValues[field] !== info.defaults[field]
      ) {
        const league =
          leagues.find((x) => x.cp === poracleValues.pvp_ranking_league) || {}
        switch (field) {
          case 'pvp_ranking_min_cp':
            return pvp === 'ohbem'
              ? ''
              : `${league.name}${t('cp')}${poracleValues.pvp_ranking_min_cp}`
          case 'pvp_ranking_worst':
            return `${league.name}${poracleValues.pvp_ranking_worst}`
          case 'pvp_ranking_best':
            return `${league.name}high${poracleValues.pvp_ranking_best}`
          case 'pvp_ranking_cap':
            return pvp === 'ohbem'
              ? `${t('cap').toLowerCase()}${poracleValues.pvp_ranking_cap}`
              : ''
          default:
            return ''
        }
      }
      return ''
    }
    if (!poracleValues.pvpEntry) {
      return poracleValues[field] === info.defaults[field]
        ? ''
        : `${field.replace(/_/g, '').replace('min', '')}${poracleValues[field]}`
    }
  }

  const getPoracleString = () => {
    if (!id) return ''
    if (id === 'gold-stop')
      return `${prefix}${t('invasion')} gold-stop ${Object.keys(poracleValues)
        .map(checkDefaults)
        .join(' ')}`
    if (id === 'kecleon')
      return `${prefix}${t('invasion')} ${t('poke_352')} ${Object.keys(
        poracleValues,
      )
        .map(checkDefaults)
        .join(' ')}`
    if (id === 'showcase')
      return `${prefix}${t('showcase')} ${Object.keys(poracleValues)
        .map(checkDefaults)
        .join(' ')}`
    switch (id.charAt(0)) {
      case 't':
        return `${prefix}${t('gym')}
      ${Object.keys(poracleValues).map(checkDefaults).join(' ')}`
      case 'r':
      case 'e':
        return `${prefix}${id.charAt(0) === 'e' ? t('egg') : t('raid')} ${t(
          'level',
        )}${idObj.id}
      ${Object.keys(poracleValues).map(checkDefaults).join(' ')}`
      case 'i': {
        const invasion = Object.keys(types).find(
          (x) => types[x].toLowerCase() === poracleValues.grunt_type,
        )
        return `${prefix}${t('invasion')} ${
          invasion
            ? t(`poke_type_${invasion}`)
            : t(poracleValues.grunt_type.replace(' ', ''))
        }
        ${Object.keys(poracleValues).map(checkDefaults).join(' ')}`
      }
      case 'q':
        return `${prefix}${t('quest')} ${t(`item_${idObj.id}`).replace(
          ' ',
          '_',
        )}
      ${Object.keys(poracleValues).map(checkDefaults).join(' ')}`
      case 'm':
        return `${prefix}${t('quest')} ${t('energy')}${t(`poke_${idObj.id}`)}
      ${Object.keys(poracleValues).map(checkDefaults).join(' ')}`
      case 'c':
        return `${prefix}${t('quest')} ${t('candy')}${t(`poke_${idObj.id}`)}
      ${Object.keys(poracleValues).map(checkDefaults).join(' ')}`
      case 'x':
        return `${prefix}${t('quest')} ${t('xl')}${t(`poke_${idObj.id}`)}
      ${Object.keys(poracleValues).map(checkDefaults).join(' ')}`
      case 'd':
        return `${prefix}${t('quest')} ${t('stardust')}
      ${Object.keys(poracleValues).map(checkDefaults).join(' ')}`
      case 'l':
        return `${prefix}${t('lure')} ${t(`lure_${idObj.id}`).toLowerCase()}
      ${Object.keys(poracleValues).map(checkDefaults).join(' ')}`
      default:
        return `${prefix}${category === 'pokemon' ? t('track') : t(category)} 
      ${t(`poke_${idObj.id === '0' ? 'global' : idObj.id}`)} 
      ${
        !poracleValues.allForms && +idObj.form
          ? `form:${t(`form_${idObj.form}`).replace(/ /g, '_')}`
          : ''
      } 
      ${
        poracleValues.noIv
          ? `${poracleValues.clean ? ` ${t('clean')} ` : ''}${
              poracleValues.byDistance && parseInt(poracleValues.distance)
                ? ` d${poracleValues.distance} `
                : ''
            }`
          : Object.keys(poracleValues).map(checkDefaults).join(' ')
      }
      ${poracleValues.gender ? ` ${t(`gender_${poracleValues.gender}`)}` : ''}`
    }
  }

  const getDisabled = (option) => {
    if (typeof option?.disabled === 'boolean') return option.disabled
    switch (option.name) {
      case 'xl':
      case 'xs':
        return !pokemon[idObj.id]
      case 'allForms':
        return idObj.id === '0'
      case 'distance':
        return !poracleValues.byDistance
      case 'amount':
        return (
          option?.disabled?.some((x) => id.startsWith(x)) ||
          /\d/.test(id.charAt(0))
        )
      case 'pvpEntry':
        return human.blocked_alerts?.includes('pvp')
      default:
        return option?.disabled?.some((x) => id.startsWith(x))
    }
  }

  const getInputs = (type, options, parent) => {
    const size = Math.floor(12 / options.length)
    switch (type) {
      case 'sliders':
        return options.map((option, i) => (
          <Grid
            key={option.name}
            item
            xs={12}
            sm={option.size || 6}
            style={isMobile ? { marginTop: i ? 'inherit' : 10 } : {}}
          >
            <SliderTile
              filterSlide={option}
              handleChange={handleSlider}
              filterValues={filterValues}
            />
          </Grid>
        ))
      case 'selects':
        return options.map((option) => (
          <Grid
            key={option.name}
            item
            xs={option.xs || 6}
            sm={option.sm || size}
            style={{ margin: '10px 0', textAlign: 'center' }}
          >
            <FormControl variant="outlined" size="small">
              <InputLabel>{t(option.name)}</InputLabel>
              <Select
                autoFocus
                name={option.name}
                value={poracleValues[option.name]}
                onChange={handleSelect}
                label={t(option.name)}
                disabled={getDisabled(option)}
              >
                {getOptions(option)}
              </Select>
            </FormControl>
          </Grid>
        ))
      case 'booleans':
        return options.map((option) => (
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
                {t(Utility.camelToSnake(option.name))}
              </Typography>
            </Grid>
            <Grid item xs={6} style={{ textAlign: 'center' }}>
              <Switch
                name={option.name}
                color="primary"
                onChange={handleSwitch}
                checked={Boolean(poracleValues[option.name])}
                disabled={getDisabled(option)}
              />
            </Grid>
          </Grid>
        ))
      case 'texts':
        return options.map((option) => (
          <Grid
            key={option.name}
            item
            xs={option.xs || 6}
            sm={option.sm || size}
            style={{ margin: '10px 0', textAlign: 'center' }}
          >
            <TextField
              autoComplete="off"
              name={option.name}
              label={t(option.name)}
              value={poracleValues[option.name]}
              onChange={handleSelect}
              variant="outlined"
              disabled={getDisabled(option)}
              type={option.type || 'text'}
              size="small"
              style={{ width: option.width || 120 }}
              inputProps={{
                min:
                  option.name === 'pvp_ranking_min_cp' &&
                  poracleValues.pvp_ranking_league
                    ? leagues.find(
                        (x) => x.cp === poracleValues.pvp_ranking_league,
                      )?.min || 0
                    : option.min || 0,
                max:
                  option.name === 'pvp_ranking_min_cp' &&
                  poracleValues.pvp_ranking_league
                    ? poracleValues.pvp_ranking_league || 0
                    : option.max || 10000,
              }}
              InputProps={{
                endAdornment: option.adornment ? (
                  <InputAdornment position="end">
                    {t(option.adornment)}
                  </InputAdornment>
                ) : null,
              }}
            />
          </Grid>
        ))
      case 'autoComplete':
        return options.map((option) => (
          <Grid
            key={option.name}
            item
            container
            xs={option.xs}
            sm={option.sm}
            justifyContent="center"
            alignItems="center"
          >
            <Grid item xs={11}>
              <Autocomplete
                style={{ width: '100%' }}
                getOptionLabel={(x) =>
                  `${x.name} - ${Utility.formatter(addressFormat, x.formatted)}`
                }
                filterOptions={(x) => x}
                options={fetchedData ? fetchedData.search : []}
                autoComplete
                disabled={!hasNominatim}
                includeInputInList
                freeSolo
                onChange={(event, newValue) => {
                  if (newValue) {
                    setPoracleValues({ ...poracleValues, gym_id: newValue.id })
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    // eslint-disable-next-line react/jsx-props-no-spreading
                    {...params}
                    label={
                      <Trans i18nKey="search_specific">
                        {{ category: t(option.label) }}
                      </Trans>
                    }
                    variant="outlined"
                    onChange={(e) =>
                      search({
                        variables: {
                          search: e.target.value,
                          category: option.searchCategory,
                          ts: Math.floor(Date.now() / 1000),
                        },
                      })
                    }
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loading ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(x) => (
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">{x.name}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption">
                        {Utility.formatter(addressFormat, x.formatted)}
                      </Typography>
                    </Grid>
                    <Divider
                      light
                      flexItem
                      style={{ height: 2, width: '90%', margin: '5px 0' }}
                    />
                  </Grid>
                )}
              />
            </Grid>
          </Grid>
        ))
      // Recursive for nested props
      default:
        return (
          <Grid
            key={type}
            container
            item
            xs={12}
            justifyContent="center"
            alignItems="center"
          >
            <Divider
              light
              flexItem
              style={{ height: 3, width: '90%', margin: '10px 0' }}
            />
            {Object.keys(info.ui[parent][type]).map((subType) =>
              getInputs(subType, info.ui[parent][type][subType], type),
            )}
          </Grid>
        )
    }
  }

  return (
    <>
      <Header
        titles={Poracle.getTitles(idObj)}
        action={toggleWebhook(false, id)}
      />
      <DialogContent style={{ color: 'white', padding: '8px 5px' }}>
        {Object.keys(info.ui).map((type) => {
          if (
            human.blocked_alerts &&
            JSON.parse(human.blocked_alerts).includes(type)
          )
            return null
          if (type === 'global' && (idObj.id !== 'global' || !everything))
            return null
          const Items = (
            <Grid container justifyContent="center" alignItems="center">
              {Object.keys(info.ui[type]).map((subType) =>
                getInputs(subType, info.ui[type][subType], type),
              )}
            </Grid>
          )
          return (
            <Paper
              style={{ margin: 10, width: '95%' }}
              elevation={3}
              key={type}
            >
              {type === 'general' ||
              type === 'distanceOrArea' ||
              type === 'global' ? (
                Items
              ) : (
                <Accordion
                  expanded={webhookAdv[type]}
                  onChange={handleChange(type)}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore style={{ color: 'white' }} />}
                    className={classes.accordionSummary}
                  >
                    <Typography className={classes.heading}>
                      {t(type)}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>{Items}</AccordionDetails>
                </Accordion>
              )}
            </Paper>
          )
        })}
        <Paper
          style={{ margin: 10, width: '95%', textAlign: 'center' }}
          elevation={1}
        >
          <Typography variant="subtitle1" color="secondary">
            {getPoracleString().toLowerCase()}
          </Typography>
        </Paper>
      </DialogContent>
      <Footer options={footerOptions} role="webhook_advanced" />
    </>
  )
}

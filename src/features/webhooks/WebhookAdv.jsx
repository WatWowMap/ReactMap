// @ts-check

/* eslint-disable react/jsx-no-duplicate-props */
import * as React from 'react'
import ExpandMore from '@mui/icons-material/ExpandMore'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Unstable_Grid2'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Autocomplete from '@mui/material/Autocomplete'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import { useTranslation } from 'react-i18next'
import { useLazyQuery } from '@apollo/client'
import { debounce } from 'lodash'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { Query } from '@services/queries'
import { SliderTile } from '@components/inputs/SliderTile'
import { Header } from '@components/dialogs/Header'
import { Footer } from '@components/dialogs/Footer'
import { useWebhookStore } from '@store/useWebhookStore'
import { useAnalytics } from '@hooks/useAnalytics'
import { camelToSnake } from '@utils/strings'
import { FCSelect } from '@components/inputs/FCSelect'

import { Poracle } from './services/Poracle'
import { FORM_ONLY_FIELDS, toForm } from './services/ruleForm'

const skipFields = new Set([
  ...FORM_ONLY_FIELDS,
  'distance',
  'gender',
  'max_size',
  'ping',
  'pokemon_id',
  'form',
  'level',
  'lure_id',
  'reward',
  'reward_type',
  'grunt_type',
  'display_type',
  'gym_id',
  'shiny',
  'clean',
  'edit',
  'summary',
  'exclusive',
  'slot_changes',
  'battle_changes',
  'team',
  'rsvp_changes',
  'uid',
  'description',
])

const wildCards = {
  raid: ['r90'],
  egg: ['e90'],
  gym: ['t4'],
  invasion: ['i0'],
}

/** Global edits must not overwrite what identifies each selected item. */
const GLOBAL_IDENTITY = {
  pokemon: ['form'],
  raid: ['form', 'level'],
  nest: ['form'],
  quest: ['form', 'amount'],
  invasion: ['gender'],
}
/** Derived from identity fields, so they stay per item too. */
const GLOBAL_DERIVED = ['allForms', 'xs', 'xl', 'min_weight', 'max_weight']

/** Switches shown only when the Poracle server supports them. */
const CAPABILITY_GATED = { edit: true, summary: true }

/** MUI selects cannot hold `null`; this stands in for "any" in the menu. */
const ANY = '__any__'

/** Named values map back to the numeric locale keys (`team_1`, ...). */
const LABEL_INDEX = {
  team: { harmony: 0, mystic: 1, valor: 2, instinct: 3, any: 4 },
  gender: { male: 1, female: 2, genderless: 3 },
  rsvp_changes: { none: 0, rsvp: 1, rsvp_only: 2 },
}
const LABEL_PREFIX = { team: 'team', gender: 'gender', rsvp_changes: 'rsvp' }

/**
 * @param {(key: string, fallback?: string) => string} t
 * @param {'team' | 'gender' | 'rsvp_changes'} field
 * @param {string | null} value
 */
const namedLabel = (t, field, value) => {
  // rsvp_changes null means "none" (no RSVP updates), not "any"
  if (field === 'rsvp_changes' && (value === null || value === undefined))
    return t('rsvp_0')
  return value === null || value === undefined || value === 'any'
    ? t('any')
    : t(`${LABEL_PREFIX[field]}_${LABEL_INDEX[field][value] ?? value}`, value)
}

export function WebhookAdvanced() {
  const { id, uid, category, open, selectedIds, onClose } = useWebhookStore(
    (s) => s.advanced,
  )
  const idObj = Poracle.getIdObj(id)
  const { t } = useTranslation()
  const location = useStorage((s) => s.location)
  const webhookAdv = useStorage((s) => s.webhookAdv)
  const {
    templates,
    prefix,
    leagues,
    pvp,
    hasNominatim,
    locale,
    everything,
    capabilities,
  } = useWebhookStore((s) => s.context)
  const info = useWebhookStore((s) => s.context.ui?.[category])
  const human = useWebhookStore((s) => s.human)
  const profile = useWebhookStore((s) => s.profile)
  const tempFilters = useWebhookStore((s) => s.tempFilters[id])
  const { pokemon, moves, types } = useMemory((s) => s.masterfile)
  const isMobile = useMemory((s) => s.isMobile)

  /** @returns {Record<string, any>} */
  const initialForm = () =>
    info
      ? {
          profile_no: human.current_profile_no,
          ...toForm(category, tempFilters ?? info.defaults, info),
        }
      : {}
  const [poracleValues, setPoracleValues] = React.useState(initialForm)
  const defaultForm = React.useMemo(
    () => (info ? toForm(category, info.defaults, info) : {}),
    [category, info],
  )

  useAnalytics(`/poracle/${category}`)

  const [search, { data, previousData, loading }] = useLazyQuery(
    Query.search('webhook'),
    {
      variables: {
        search: '',
        category: '',
        lat: location[0],
        lon: location[1],
        locale: localStorage.getItem('i18nextLng'),
      },
    },
  )
  const sendSearch = React.useCallback(
    (e, searchCategory) =>
      search({
        variables: {
          search: e.target.value,
          category: searchCategory,
          ts: Math.floor(Date.now() / 1000),
        },
      }),
    [search],
  )
  const debounceChange = React.useMemo(
    () => debounce(sendSearch, 250),
    [sendSearch],
  )

  const fetchedData = data || previousData

  React.useEffect(() => {
    setPoracleValues(initialForm())
  }, [tempFilters, id, human.current_profile_no, info])

  React.useEffect(() => {
    setPoracleValues((prev) => ({
      ...prev,
      everything_individually: !!selectedIds.length,
    }))
  }, [selectedIds])

  const handleSlider = React.useCallback(
    (low, high) => (name, values) => {
      setPoracleValues((prev) => ({
        ...prev,
        [low]: values[0],
        [high]: values[1],
        pvpEntry: name.startsWith('pvp'),
      }))
    },
    [],
  )

  const handleSwitch = (event) => {
    const { name, checked } = event.target
    switch (name) {
      case 'xl':
        setPoracleValues({
          ...poracleValues,
          min_weight: checked
            ? Math.ceil(pokemon[idObj.id].weight * 1.313)
            : null,
          max_weight: null,
          [name]: checked,
          xs: false,
        })
        break
      case 'xs':
        setPoracleValues({
          ...poracleValues,
          min_weight: null,
          max_weight: checked
            ? Math.floor(pokemon[idObj.id].weight / 1.6431924)
            : null,
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
          move: null,
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
    const { name } = event.target
    const value = event.target.value === ANY ? null : event.target.value
    const newObj = { [name]: value }
    if (name === 'pvp_ranking_league') {
      newObj.pvp_ranking_min_cp = pvp === 'ohbem' || !value ? 0 : value - 50
    }
    if (name.startsWith('pvp')) {
      newObj.pvpEntry = name === 'pvp_ranking_league' ? value > 0 : true
    }
    if (name === 'move') {
      newObj.move = value === null ? null : +value
      newObj.allMoves = value === null
    }
    if (name === 'template') {
      newObj[name] = value === null ? null : value.toString()
    }
    setPoracleValues({ ...poracleValues, ...newObj })
  }

  /** Number inputs hand back strings; rules need numbers. */
  const handleText = (type) => (event) => {
    const { name, value } = event.target
    setPoracleValues({
      ...poracleValues,
      [name]: type === 'number' ? Number(value) || 0 : value,
      ...(name.startsWith('pvp') ? { pvpEntry: true } : {}),
    })
  }

  const handleChange = (panel) => (_, isExpanded) => {
    useStorage.setState((prev) => ({
      webhookAdv: { ...prev.webhookAdv, [panel]: isExpanded },
    }))
  }

  const getOptions = (option) => {
    const menuItems = []
    switch (option.name) {
      case 'template':
        // null = the Poracle server's default template
        menuItems.push(
          <MenuItem key={ANY} value={ANY} dense>
            {t('default_template', 'Default')}
          </MenuItem>,
        )
        templates[poracleValues.noIv ? `${category}NoIv` : category]?.[
          human.language || locale
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
              {subOption ? t(subOption, subOption).toString() : t('all')}
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
      case 'team':
      case 'rsvp_changes':
        option.options.forEach((named) =>
          menuItems.push(
            <MenuItem key={named ?? ANY} value={named ?? ANY} dense>
              {namedLabel(t, option.name, named)}
            </MenuItem>,
          ),
        )
        break
      case 'move':
        menuItems.push(
          <MenuItem key={ANY} value={ANY} dense>
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
              {t(subOption, subOption).toString()}
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
    if (field === 'edit' && poracleValues.edit && capabilities?.edit)
      return ` ${t('edit')} `
    if (field === 'summary' && poracleValues.summary && capabilities?.summary)
      return ` ${t('summary')} `
    if (field === 'min_spawn_avg' && poracleValues.min_spawn_avg > 0)
      return ` ${t('minspawn')}${poracleValues.min_spawn_avg} `
    if (field === 'slot_changes' && poracleValues.slot_changes)
      return ` ${t('slot_changes_poracle')} `
    if (field === 'battle_changes' && poracleValues.battle_changes)
      return ` ${t('battle_changes_poracle')} `
    if (
      field === 'team' &&
      poracleValues.team !== null &&
      poracleValues.team !== undefined &&
      poracleValues.team !== 'any'
    )
      return namedLabel(t, 'team', poracleValues.team)
    if (
      field === 'rsvp_changes' &&
      poracleValues.rsvp_changes !== null &&
      poracleValues.rsvp_changes !== undefined &&
      poracleValues.rsvp_changes !== 'none'
    )
      return namedLabel(t, 'rsvp_changes', poracleValues.rsvp_changes)
    if (
      field === 'everything_individually' &&
      poracleValues.everything_individually
    )
      return ` ${t('individually')} `
    if (
      field === 'template' &&
      (poracleValues.template === null || poracleValues.template === '')
    )
      return ''
    if (skipFields.has(field) || !(field in defaultForm)) return ''
    if (field.startsWith('pvp')) {
      if (
        poracleValues.pvpEntry &&
        poracleValues.pvp_ranking_league &&
        poracleValues[field] !== defaultForm[field]
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
      return poracleValues[field] === defaultForm[field]
        ? ''
        : `${field.replace(/_/g, '').replace('min', '')}${poracleValues[field]}`
    }
  }

  const getPoracleString = () => {
    if (!id) return ''
    if (category === 'incident') {
      const settings = Object.keys(poracleValues).map(checkDefaults).join(' ')
      switch (id) {
        case 'gold-stop':
          return `${prefix}${t('invasion')} gold-stop ${settings}`
        case 'kecleon':
          return `${prefix}${t('invasion')} ${t('poke_352')} ${settings}`
        case 'showcase':
          return `${prefix}${t('showcase')} ${settings}`
        default:
          return `${prefix}${t('invasion')} ${t(
            `incident_${idObj.id}`,
            `${idObj.id}`,
          )} ${settings}`
      }
    }
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
        return poracleValues?.grunt_type
          ? `${prefix}${t('invasion')} ${
              invasion
                ? t(`poke_type_${invasion}`)
                : t(poracleValues.grunt_type.replace(' ', ''))
            }
        ${Object.keys(poracleValues).map(checkDefaults).join(' ')}`
          : ''
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
      ${
        poracleValues.gender && poracleValues.gender !== 'any'
          ? ` ${namedLabel(t, 'gender', poracleValues.gender)}`
          : ''
      }`
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
        return options
          .filter((option) => poracleValues[option.low] !== undefined)
          .map((option, i) => (
            <Grid
              key={option.name}
              xs={12}
              sm={option.size || 6}
              style={isMobile ? { marginTop: i ? 'inherit' : 10 } : {}}
            >
              <SliderTile
                slide={option}
                handleChange={handleSlider(option.low, option.high)}
                values={[poracleValues[option.low], poracleValues[option.high]]}
              />
            </Grid>
          ))
      case 'selects':
        return options
          .filter((option) => poracleValues[option.name] !== undefined)
          .map((option) => (
            <Grid
              key={option.name}
              xs={option.xs || 6}
              sm={option.sm || size}
              style={{ margin: '10px 0', textAlign: 'center' }}
            >
              <FCSelect
                name={option.name}
                value={poracleValues[option.name] ?? ANY}
                onChange={handleSelect}
                label={t(option.name)}
                disabled={getDisabled(option)}
                fcSx={{ width: '80%' }}
              >
                {getOptions(option)}
              </FCSelect>
            </Grid>
          ))
      case 'booleans':
        return options
          .filter(
            (option) =>
              !(option.name in CAPABILITY_GATED) || capabilities?.[option.name],
          )
          .map((option) => (
            <Grid
              key={option.name}
              container
              xs={option.xs || 6}
              sm={option.sm || size}
              justifyContent="center"
              alignItems="center"
              direction={isMobile || option.override ? 'row' : 'column'}
              style={{ margin: '10px 0' }}
            >
              <Grid xs={6} textAlign="center">
                <Typography variant="subtitle2">
                  {t(camelToSnake(option.name))}
                </Typography>
              </Grid>
              <Grid xs={6} textAlign="center">
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
            xs={option.xs || 6}
            sm={option.sm || size}
            style={{ margin: '10px 0', textAlign: 'center' }}
          >
            <TextField
              autoComplete="off"
              name={option.name}
              label={t(option.name)}
              value={
                poracleValues[option.name] ||
                (option.type === 'number' ? 0 : '')
              }
              onChange={handleText(option.type)}
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
            container
            xs={option.xs}
            sm={option.sm}
            justifyContent="center"
            alignItems="center"
          >
            <Grid xs={11}>
              <Autocomplete
                style={{ width: '100%' }}
                getOptionLabel={(x) => x.formatted}
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
                    {...params}
                    label={t('search_specific', { category: t(option.label) })}
                    variant="outlined"
                    onChange={(e) => debounceChange(e, option.searchCategory)}
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
                renderOption={(props, x) => (
                  <Grid
                    component="li"
                    container
                    alignItems="center"
                    rowSpacing={1}
                    {...props}
                  >
                    <Grid xs={12}>
                      <Typography variant="subtitle2">{x.name}</Typography>
                    </Grid>
                    <Grid xs={12} maxWidth="100%">
                      <Typography variant="caption">{x.formatted}</Typography>
                    </Grid>
                    <Divider
                      light
                      flexItem
                      style={{ height: 2, width: '100%', margin: '5px 0' }}
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
            xs={12}
            justifyContent="center"
            alignItems="center"
          >
            <Divider
              light
              flexItem
              style={{ height: 3, width: '90%', margin: '10px 0' }}
            />
            {Object.keys(info?.ui[parent][type] || {}).map((subType) =>
              getInputs(subType, info.ui[parent][type][subType], type),
            )}
          </Grid>
        )
    }
  }

  const handleClose = (save, filterId, filterToSave) => {
    const realSave = typeof save === 'boolean' && save
    if (uid) {
      // A tracked rule saves through its own onClose (TrackedTile); writing it
      // to tempFilters would re-POST it from Add New later.
    } else if (realSave) {
      useWebhookStore.setState((prev) => {
        if (filterId === 'global' && filterToSave) {
          const newFilters = {}
          const wc = wildCards[category] || ['0-0']
          const shared = { ...filterToSave }
          ;[
            ...(info?.identifiers || []),
            ...(GLOBAL_IDENTITY[category] || []),
            ...GLOBAL_DERIVED,
          ].forEach((key) => delete shared[key])
          const targets =
            filterToSave.everything_individually !== false ? selectedIds : wc
          targets.forEach((item) => {
            newFilters[item] = {
              ...prev.tempFilters[item],
              ...shared,
              enabled: true,
            }
          })
          return {
            tempFilters: {
              ...prev.tempFilters,
              ...newFilters,
              [filterId]: { ...filterToSave },
            },
          }
        }
        if (filterId && filterToSave) {
          return {
            tempFilters: {
              ...prev.tempFilters,
              [filterId]: {
                ...prev.tempFilters[id],
                ...filterToSave,
                enabled: true,
              },
            },
          }
        }
        return prev
      })
    } else {
      useWebhookStore.setState((prev) => ({
        tempFilters: { ...prev.tempFilters, [filterId]: { ...info?.defaults } },
      }))
    }
    if (onClose) onClose(poracleValues, realSave)
    useWebhookStore.setState((prev) => ({
      advanced: {
        ...prev.advanced,
        id: '',
        uid: 0,
        open: false,
        selectedIds: [],
      },
    }))
  }

  const footerOptions = React.useMemo(
    () => [
      /** @type {import('@components/dialogs/Footer').FooterButton} */ ({
        name: 'save',
        action: () => handleClose(true, id, poracleValues),
        icon: 'Save',
      }),
    ],
    [id, poracleValues, selectedIds],
  )

  if (!info || !tempFilters) return null

  return (
    <Dialog
      open={!!(open && id)}
      fullWidth={!isMobile}
      fullScreen={isMobile}
      onClose={handleClose}
    >
      <Header titles={Poracle.getTitles(idObj)} action={handleClose} />
      <DialogContent style={{ padding: '8px 5px' }}>
        {Object.keys(info?.ui || {}).map((type) => {
          if (human.blocked_alerts.includes(type)) return null
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
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>{t(type)}</Typography>
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
    </Dialog>
  )
}

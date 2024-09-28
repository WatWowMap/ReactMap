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

const skipFields = new Set([
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
  'all',
  'real_grunt_id',
])

const wildCards = {
  raid: ['r90'],
  egg: ['e90'],
  gym: ['t4'],
  invasion: ['i0'],
}

export function WebhookAdvanced() {
  const { id, category, open, selectedIds, onClose } = useWebhookStore(
    (s) => s.advanced,
  )
  const idObj = Poracle.getIdObj(id)
  const { t } = useTranslation()
  const location = useStorage((s) => s.location)
  const webhookAdv = useStorage((s) => s.webhookAdv)
  const { templates, prefix, leagues, pvp, hasNominatim, locale, everything } =
    useWebhookStore((s) => s.context)
  const info = useWebhookStore((s) => s.context.ui?.[category])
  const human = useWebhookStore((s) => s.human)
  const profile = useWebhookStore((s) => s.profile)
  const tempFilters = useWebhookStore((s) => s.tempFilters[id])
  const { pokemon, moves, types } = useMemory((s) => s.masterfile)
  const isMobile = useMemory((s) => s.isMobile)

  const [filterValues, setFilterValues] = React.useState(
    tempFilters?.template
      ? Poracle.reactMapFriendly(tempFilters)
      : {
          ...Poracle.reactMapFriendly(info?.defaults),
          profile_no: human.current_profile_no,
        },
  )
  const [poracleValues, setPoracleValues] = React.useState(
    tempFilters?.template
      ? tempFilters
      : { ...info?.defaults, profile_no: human.current_profile_no },
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
    setPoracleValues(
      tempFilters?.template
        ? { ...tempFilters }
        : { ...info?.defaults, profile_no: human.current_profile_no },
    )
    setFilterValues(
      tempFilters?.template
        ? Poracle.reactMapFriendly(tempFilters)
        : {
            ...Poracle.reactMapFriendly(info?.defaults),
            profile_no: human.current_profile_no,
          },
    )
  }, [tempFilters, id, human.current_profile_no, info?.defaults])

  React.useEffect(() => {
    setPoracleValues((prev) => ({
      ...prev,
      everything_individually: !!selectedIds.length,
    }))
  }, [selectedIds])

  const handleSlider = React.useCallback(
    (low, high) => (name, values) => {
      setFilterValues((prev) => ({ ...prev, [name]: values }))
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
            : info?.defaults.min_weight,
          max_weight: info?.defaults.max_weight,
          [name]: checked,
          xs: false,
        })
        break
      case 'xs':
        setPoracleValues({
          ...poracleValues,
          min_weight: info?.defaults.min_weight,
          max_weight: checked
            ? Math.floor(pokemon[idObj.id].weight / 1.6431924)
            : info?.defaults.max_weight,
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

  const handleChange = (panel) => (_, isExpanded) => {
    useStorage.setState((prev) => ({
      webhookAdv: { ...prev.webhookAdv, [panel]: isExpanded },
    }))
  }

  const getOptions = (option) => {
    const menuItems = []

    switch (option.name) {
      case 'template':
        templates[poracleValues.noIv ? `${category}NoIv` : category]?.[
          human.language || locale
        ]?.forEach((item) =>
          menuItems.push(
            <MenuItem key={item} dense value={item}>
              {item}
            </MenuItem>,
          ),
        )
        break
      case 'profile_no':
        if (profile.length) {
          profile.forEach((pro) =>
            menuItems.push(
              <MenuItem key={pro.name} dense value={pro.profile_no}>
                {pro.name}
              </MenuItem>,
            ),
          )
        } else {
          menuItems.push(
            <MenuItem key={1} dense value={1}>
              1
            </MenuItem>,
          )
        }
        break
      case 'pvp_ranking_cap':
        option.options.forEach((subOption) =>
          menuItems.push(
            <MenuItem key={subOption} dense value={subOption}>
              {subOption ? t(subOption, subOption).toString() : t('all')}
            </MenuItem>,
          ),
        )
        break
      case 'pvp_ranking_league':
        option.options.forEach((league) =>
          menuItems.push(
            <MenuItem key={league.name} dense value={league.cp}>
              {t(`slider_${league.name}`)}
            </MenuItem>,
          ),
        )
        break
      case 'gender':
        option.options.forEach((gender) =>
          menuItems.push(
            <MenuItem key={gender} dense value={gender}>
              {t(`gender_${gender}`)}
            </MenuItem>,
          ),
        )
        break
      case 'team':
        option.options.forEach((team) =>
          menuItems.push(
            <MenuItem key={team} dense value={team}>
              {t(`team_${team}`, t('any'))}
            </MenuItem>,
          ),
        )
        break
      case 'move':
        menuItems.push(
          <MenuItem key={9000} dense value={9000}>
            {t('any')}
          </MenuItem>,
        )
        if (id === 'global') {
          Object.keys(moves).forEach((move) => {
            if (moves[move].type) {
              menuItems.push(
                <MenuItem key={move} dense value={move}>
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
                    <MenuItem key={move} dense value={move}>
                      {t(`move_${move}`)}
                    </MenuItem>,
                  )
                },
              )
            } else if (pokemon[idObj.id][moveType]) {
              pokemon[idObj.id][moveType].forEach((move) => {
                menuItems.push(
                  <MenuItem key={move} dense value={move}>
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
            <MenuItem key={subOption} dense value={subOption}>
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
    if (skipFields.has(field)) return ''
    if (field.startsWith('pvp')) {
      if (
        poracleValues.pvpEntry &&
        poracleValues.pvp_ranking_league &&
        poracleValues[field] !== info?.defaults[field]
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
      return poracleValues[field] === info?.defaults[field]
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
        return options
          .filter((option) => filterValues[option.name] !== undefined)
          .map((option, i) => (
            <Grid
              key={option.name}
              sm={option.size || 6}
              style={isMobile ? { marginTop: i ? 'inherit' : 10 } : {}}
              xs={12}
            >
              <SliderTile
                handleChange={handleSlider(option.low, option.high)}
                slide={option}
                values={filterValues[option.name]}
              />
            </Grid>
          ))
      case 'selects':
        return options
          .filter((option) => poracleValues[option.name] !== undefined)
          .map((option) => (
            <Grid
              key={option.name}
              sm={option.sm || size}
              style={{ margin: '10px 0', textAlign: 'center' }}
              xs={option.xs || 6}
            >
              <FCSelect
                disabled={getDisabled(option)}
                fcSx={{ width: '80%' }}
                label={t(option.name)}
                name={option.name}
                value={poracleValues[option.name]}
                onChange={handleSelect}
              >
                {getOptions(option)}
              </FCSelect>
            </Grid>
          ))
      case 'booleans':
        return options.map((option) => (
          <Grid
            key={option.name}
            container
            alignItems="center"
            direction={isMobile || option.override ? 'row' : 'column'}
            justifyContent="center"
            sm={option.sm || size}
            style={{ margin: '10px 0' }}
            xs={option.xs || 6}
          >
            <Grid textAlign="center" xs={6}>
              <Typography variant="subtitle2">
                {t(camelToSnake(option.name))}
              </Typography>
            </Grid>
            <Grid textAlign="center" xs={6}>
              <Switch
                checked={Boolean(poracleValues[option.name])}
                color="primary"
                disabled={getDisabled(option)}
                name={option.name}
                onChange={handleSwitch}
              />
            </Grid>
          </Grid>
        ))
      case 'texts':
        return options.map((option) => (
          <Grid
            key={option.name}
            sm={option.sm || size}
            style={{ margin: '10px 0', textAlign: 'center' }}
            xs={option.xs || 6}
          >
            <TextField
              InputProps={{
                endAdornment: option.adornment ? (
                  <InputAdornment position="end">
                    {t(option.adornment)}
                  </InputAdornment>
                ) : null,
              }}
              autoComplete="off"
              disabled={getDisabled(option)}
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
              label={t(option.name)}
              name={option.name}
              size="small"
              style={{ width: option.width || 120 }}
              type={option.type || 'text'}
              value={
                poracleValues[option.name] ||
                (option.type === 'number' ? 0 : '')
              }
              variant="outlined"
              onChange={handleSelect}
            />
          </Grid>
        ))
      case 'autoComplete':
        return options.map((option) => (
          <Grid
            key={option.name}
            container
            alignItems="center"
            justifyContent="center"
            sm={option.sm}
            xs={option.xs}
          >
            <Grid xs={11}>
              <Autocomplete
                autoComplete
                freeSolo
                includeInputInList
                disabled={!hasNominatim}
                filterOptions={(x) => x}
                getOptionLabel={(x) => x.formatted}
                options={fetchedData ? fetchedData.search : []}
                renderInput={(params) => (
                  <TextField
                    {...params}
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
                    label={t('search_specific', { category: t(option.label) })}
                    variant="outlined"
                    onChange={(e) => debounceChange(e, option.searchCategory)}
                  />
                )}
                renderOption={(props, x) => (
                  <Grid
                    container
                    alignItems="center"
                    component="li"
                    rowSpacing={1}
                    {...props}
                  >
                    <Grid xs={12}>
                      <Typography variant="subtitle2">{x.name}</Typography>
                    </Grid>
                    <Grid maxWidth="100%" xs={12}>
                      <Typography variant="caption">{x.formatted}</Typography>
                    </Grid>
                    <Divider
                      flexItem
                      light
                      style={{ height: 2, width: '100%', margin: '5px 0' }}
                    />
                  </Grid>
                )}
                style={{ width: '100%' }}
                onChange={(event, newValue) => {
                  if (newValue) {
                    setPoracleValues({ ...poracleValues, gym_id: newValue.id })
                  }
                }}
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
            alignItems="center"
            justifyContent="center"
            xs={12}
          >
            <Divider
              flexItem
              light
              style={{ height: 3, width: '90%', margin: '10px 0' }}
            />
            {Object.keys(info?.ui[parent][type] || {}).map((subType) =>
              getInputs(subType, info.ui[parent][type][subType], type),
            )}
          </Grid>
        )
    }
  }

  const handleClose = (save = false, filterId = '', filterToSave = null) => {
    const realSave = typeof save === 'boolean' && save

    if (realSave) {
      useWebhookStore.setState((prev) => {
        if (filterId === 'global' && filterToSave) {
          const newFilters = {}
          const wc = wildCards[category] || ['0-0']

          if (filterToSave.everything_individually !== false) {
            selectedIds.forEach((item) => {
              newFilters[item] = {
                ...prev.tempFilters[item],
                ...filterToSave,
                enabled: true,
              }
            })
          } else {
            wc.forEach((item) => {
              newFilters[item] = {
                ...prev.tempFilters[item],
                ...filterToSave,
                enabled: true,
              }
            })
          }

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

  const footerOptions: import('@components/dialogs/Footer').FooterButton[] =
    React.useMemo(
      () => [
        {
          name: 'save',
          action: () => handleClose(true, id, poracleValues),
          icon: 'Save',
        },
      ],
      [id, poracleValues, selectedIds],
    )

  if (!info || !tempFilters) return null

  return (
    <Dialog
      fullScreen={isMobile}
      fullWidth={!isMobile}
      open={!!(open && id)}
      onClose={handleClose}
    >
      <Header action={handleClose} titles={Poracle.getTitles(idObj)} />
      <DialogContent style={{ padding: '8px 5px' }}>
        {Object.keys(info?.ui || {}).map((type) => {
          if (human.blocked_alerts.includes(type)) return null
          if (type === 'global' && (idObj.id !== 'global' || !everything))
            return null
          const Items = (
            <Grid container alignItems="center" justifyContent="center">
              {Object.keys(info.ui[type]).map((subType) =>
                getInputs(subType, info.ui[type][subType], type),
              )}
            </Grid>
          )

          return (
            <Paper
              key={type}
              elevation={3}
              style={{ margin: 10, width: '95%' }}
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
          elevation={1}
          style={{ margin: 10, width: '95%', textAlign: 'center' }}
        >
          <Typography color="secondary" variant="subtitle1">
            {getPoracleString().toLowerCase()}
          </Typography>
        </Paper>
      </DialogContent>
      <Footer i18nKey="webhook_advanced" options={footerOptions} />
    </Dialog>
  )
}

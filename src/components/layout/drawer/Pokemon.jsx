// @ts-check
/* eslint-disable react/no-unstable-nested-components */
import * as React from 'react'
import {
  Typography,
  AppBar,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  Box,
  IconButton,
  ButtonGroup,
  Collapse,
  Tooltip,
  Divider,
  ListSubheader,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { VirtuosoGrid } from 'react-virtuoso'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import TuneIcon from '@mui/icons-material/Tune'
import CheckIcon from '@mui/icons-material/Check'
import ClearIcon from '@mui/icons-material/Clear'

import { useDeepStore, useStatic, useStore } from '@hooks/useStore'
import Utility from '@services/Utility'
import { FILTER_SIZES, IV_OVERRIDES } from '@assets/constants'

import { StringFilterMemo } from '../dialogs/filters/StringFilter'
import SliderTile from '../dialogs/filters/SliderTile'
import TabPanel from '../general/TabPanel'
import AdvancedFilter from '../dialogs/filters/Advanced'
import { BoolToggle, DualBoolToggle } from './BoolToggle'
import { ItemSearchMemo } from './ItemSearch'
import { GenderListItem } from '../dialogs/filters/Gender'

function AvailableSelector() {
  const available = useStatic((s) => s.available.pokemon)
  const { t } = useTranslation()
  const Icons = useStatic((s) => s.Icons)
  const filters = useStore((s) => s.filters.pokemon)
  const search = useStore((s) => s.searches.pokemonQuickSelect || '')

  const [advanced, setAdvanced] = React.useState('global')
  const [open, setOpen] = React.useState(false)

  const items = React.useMemo(() => {
    const lowerCase = search.toLowerCase()
    return (
      filters.onlyShowAvailable
        ? available
        : Object.keys(filters.filter).filter((key) => key !== 'global')
    )
      .map((key) => {
        const [pokemon, form] = key.split('-', 2)
        const pokemonName = t(`poke_${pokemon}`)
        const formName = +form ? t(`form_${form}`) : ''

        return {
          key,
          pokemonName,
          formName,
          url: Icons.getPokemon(pokemon, form),
          color: filters.filter[key]?.enabled
            ? filters.filter[key]?.all || filters.easyMode
              ? 'success.main'
              : 'info.main'
            : 'error.dark',
        }
      })
      .filter(
        ({ pokemonName, formName }) =>
          pokemonName.toLowerCase().includes(lowerCase) ||
          formName.toLowerCase().includes(lowerCase),
      )
  }, [
    filters.onlyShowAvailable,
    filters.easyMode,
    filters.filter,
    available,
    search,
  ])

  /** @param {'enable' | 'disable' | 'advanced'} action */
  const setAll = (action) => {
    const keys = new Set(items.map((item) => item.key))
    useStore.setState((prev) => ({
      filters: {
        ...prev.filters,
        pokemon: {
          ...prev.filters.pokemon,
          filter: Object.fromEntries(
            Object.entries(prev.filters.pokemon.filter).map(([key, value]) => {
              const enabled = action !== 'disable'
              const all = action === 'enable'
              return [key, keys.has(key) ? { ...value, enabled, all } : value]
            }),
          ),
        },
      },
    }))
  }

  return (
    <List>
      <ItemSearchMemo field="searches.pokemonQuickSelect" />
      <BoolToggle
        field="filters.pokemon.onlyShowAvailable"
        label="only_show_available"
      />
      <ListItem>
        <ListItemText>{t(search ? 'set_filtered' : 'set_all')}</ListItemText>
        <ButtonGroup variant="text" size="small" color="warning">
          <IconButton color="success" onClick={() => setAll('enable')}>
            <CheckIcon />
          </IconButton>
          <Collapse in={!filters.easyMode} orientation="horizontal">
            <IconButton
              color="info"
              onClick={() => {
                setAdvanced('global')
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
        itemContent={(_, item) => {
          const title = `${item.pokemonName}${
            item.formName && item.formName !== t('form_29')
              ? ` ${item.formName}`
              : ''
          }`
          return (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              position="relative"
              sx={{ aspectRatio: '1/1', outline: 'ButtonText 1px solid' }}
              onClick={() => {
                const filter = { ...filters.filter[item.key] }
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
                        [item.key]: filter,
                      },
                    },
                  },
                }))
              }}
            >
              <Box
                height="100%"
                width="100%"
                bgcolor={item.color}
                position="absolute"
                top={0}
                left={0}
                sx={{ opacity: 0.4 }}
              />
              <Tooltip title={title} arrow>
                <img
                  alt={title}
                  src={item.url}
                  style={{
                    maxHeight: 50,
                    maxWidth: 50,
                    zIndex: 10,
                  }}
                />
              </Tooltip>
              <Collapse in={!filters.easyMode}>
                <IconButton
                  size="small"
                  sx={{ position: 'absolute', right: 0, top: 0 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setAdvanced(item.key)
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
      {!filters.easyMode && (
        <AdvancedFilter
          id={advanced}
          category="pokemon"
          open={open}
          setOpen={setOpen}
        />
      )}
    </List>
  )
}

const MemoAvailableSelector = React.memo(AvailableSelector, () => true)

export default function WithSliders({ category, context }) {
  const userSettings = useStore((s) => s.userSettings[category])
  const filterMode = useStore((s) => s.getPokemonFilterMode())
  const [ivOr, setIvOr] = useDeepStore('filters.pokemon.ivOr')
  const { t } = useTranslation()
  const [openTab, setOpenTab] = React.useState(0)

  const selectRef = React.useRef(/** @type {HTMLDivElement | null} */ (null))

  /** @type {import('@rm/types').RMSliderHandleChange<keyof import('@rm/types').PokemonFilter>} */
  const handleChange = React.useCallback((name, values) => {
    if (name in ivOr) {
      setIvOr(name, values)
    }
    Utility.analytics(
      'Global Pokemon',
      `${name}: ${values}`,
      `${category} Text`,
    )
  }, [])

  const handleTabChange = (_e, newValue) => setOpenTab(newValue)

  return (
    <>
      <BoolToggle field="filters.pokemon.enabled" label="enabled" />
      <ListItem>
        <FormControl fullWidth>
          <InputLabel id="pokemon-filter-mode">
            {t('pokemon_filter_mode')}
          </InputLabel>
          <Select
            ref={selectRef}
            labelId="pokemon-filter-mode"
            id="demo-simple-select"
            value={filterMode}
            fullWidth
            size="small"
            label={t('pokemon_filter_mode')}
            renderValue={(selected) => t(selected)}
            onChange={(e) => {
              const { setPokemonFilterMode } = useStore.getState()
              switch (e.target.value) {
                case 'basic':
                  return setPokemonFilterMode(false, true)
                case 'intermediate':
                  return setPokemonFilterMode(false, false)
                case 'expert':
                  return setPokemonFilterMode(true, false)
                default:
              }
            }}
          >
            {[
              'basic',
              'intermediate',
              ...(context.legacy ? ['expert'] : []),
            ].map((tier) => (
              <MenuItem
                key={tier}
                dense
                value={tier}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  whiteSpace: 'normal',
                  width: selectRef.current?.clientWidth || 'auto',
                }}
              >
                <Typography variant="subtitle2">{t(tier)}</Typography>
                <Typography variant="caption" flexWrap="wrap">
                  {t(`${tier}_description`)}
                </Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </ListItem>

      <Collapse in={filterMode === 'intermediate'}>
        <BoolToggle
          field="userSettings.pokemon.linkGlobalAndAdvanced"
          label="link_global_and_advanced"
        />
      </Collapse>
      {userSettings.legacyFilter && context.legacy ? (
        <StringFilterMemo field="filters.pokemon.ivOr" />
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
                      filterValues={ivOr[subItem.name]}
                    />
                  </ListItem>
                ))}
                {index ? (
                  <DualBoolToggle
                    items={FILTER_SIZES}
                    field="filters.pokemon.ivOr"
                  />
                ) : (
                  <>
                    <GenderListItem
                      disablePadding
                      field="filters.pokemon.ivOr"
                      sx={{ pt: 1 }}
                    />
                    <Divider sx={{ mt: 2, mb: 1 }} />
                    <ListSubheader disableGutters>
                      {t('quick_select')}
                    </ListSubheader>
                    <DualBoolToggle
                      field="filters.pokemon"
                      items={IV_OVERRIDES}
                    />
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

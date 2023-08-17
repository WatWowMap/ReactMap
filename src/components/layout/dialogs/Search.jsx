/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable no-nested-ternary */
import * as React from 'react'
import Dialog from '@mui/material/Dialog'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import SearchIcon from '@mui/icons-material/Search'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import Popper from '@mui/material/Popper'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Autocomplete from '@mui/material/Autocomplete'
import { useMap } from 'react-leaflet'

import { useTranslation } from 'react-i18next'
import { useLazyQuery, useQuery } from '@apollo/client'

import NameTT from '@components/popups/common/NameTT'
import { useStore, useStatic, useLayoutStore } from '@hooks/useStore'
import Utility from '@services/Utility'
import Query from '@services/Query'
import { SEARCHABLE } from '@services/queries/config'

import Header from '../general/Header'
import QuestTitle from '../general/QuestTitle'

function SearchImage({ name }) {
  const { t } = useTranslation()

  const darkMode = useStore((s) => s.darkMode)
  const Icons = useStatic((s) => s.Icons)

  return (
    <img
      className={darkMode ? '' : 'darken-image'}
      src={Icons.getMisc(name)}
      alt={t(name)}
      style={{ maxWidth: 20, maxHeight: 20 }}
    />
  )
}

function EndAdornment({ children }) {
  const loading = useStatic((s) => s.searchLoading)

  return (
    <>
      <IconButton sx={{ p: 1.25 }}>
        {loading ? (
          <CircularProgress
            size={24}
            sx={(theme) => ({
              color: theme.palette.getContrastText(
                theme.palette.background.default,
              ),
            })}
          />
        ) : (
          <SearchIcon />
        )}
      </IconButton>
      <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
      {children}
    </>
  )
}

/**
 *
 * @param {import('@mui/material').AutocompleteRenderInputParams} props
 * @returns
 */
export function FancySearch({ InputProps, ...props }) {
  const { t } = useTranslation()

  const searchTab = useStore((s) => s.searchTab)

  const { data } = useQuery(SEARCHABLE, {
    fetchPolicy: 'cache-first',
  })

  const [anchorEl, setAnchorEl] = React.useState(null)

  const handleClose = React.useCallback((selection) => {
    if (typeof selection === 'string') {
      useStore.setState({ searchTab: selection })
    }
    setAnchorEl(null)
  }, [])

  React.useEffect(() => {
    if (
      data?.searchable &&
      (typeof searchTab === 'number' || !data.searchable.includes(searchTab))
    ) {
      // searchTab value migration
      useStore.setState({ searchTab: data?.searchable[0] })
    }
  }, [searchTab, data])

  return (
    <>
      <TextField
        placeholder={t(`global_search_${searchTab}`)}
        variant="standard"
        {...props}
        InputProps={{
          ...InputProps,
          sx: { pl: 2 },
          endAdornment: (
            <EndAdornment>
              <IconButton
                color="primary"
                sx={{ p: 1.25, width: 40 }}
                onClick={(e) => setAnchorEl(e.currentTarget)}
              >
                <SearchImage name={searchTab} />
              </IconButton>
            </EndAdornment>
          ),
        }}
        sx={{ boxShadow: 1 }}
      />
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        elevation={0}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        {(data?.searchable || []).map((option) => (
          <MenuItem
            key={option}
            selected={option === searchTab}
            onClick={() => handleClose(option)}
          >
            <ListItemIcon>
              <SearchImage name={option} />
            </ListItemIcon>
            <ListItemText primary={t(option)} />
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

/** @param {string} tab */
const getBackupName = (tab) => {
  switch (tab) {
    case 'quests':
    case 'pokestops':
      return 'unknown_pokestop'
    default:
      return 'unknown_gym'
  }
}

export default function Search() {
  Utility.analytics('/search')

  const { t } = useTranslation()
  const map = useMap()

  const location = useStore((state) => state.location)
  const search = useStore((state) => state.search)
  const searchTab = useStore((state) => state.searchTab)
  const scanAreas = useStore((state) => state.filters.scanAreas)

  const mapConfig = useStatic((state) => state.config.map)
  const isMobile = useStatic((s) => s.isMobile)

  const open = useLayoutStore((s) => s.search)

  const [options, setOptions] = React.useState([])

  const [callSearch, { data, previousData, loading }] = useLazyQuery(
    Query.search(searchTab),
    {
      variables: {
        search,
        category: searchTab,
        lat: location[0],
        lon: location[1],
        locale: localStorage.getItem('i18nextLng'),
        ts: Math.floor(Date.now() / 1000),
        midnight: Utility.getMidnight(),
        onlyAreas: scanAreas?.filter?.areas || [],
      },
    },
  )

  const handleClose = React.useCallback((_, result) => {
    useLayoutStore.setState({ search: false })
    if (typeof result === 'object' && 'lat' in result && 'lon' in result) {
      map.flyTo([result.lat, result.lon], 16)
    }
  }, [])

  React.useEffect(() => {
    setOptions(
      search
        ? (data || previousData)?.[
            searchTab === 'quests'
              ? 'searchQuest'
              : searchTab === 'lures'
              ? 'searchLure'
              : 'search'
          ] || []
        : [],
    )
    Utility.analytics('Global Search', `Search Value: ${search}`, searchTab)
  }, [data])

  React.useEffect(() => {
    useStatic.setState({ searchLoading: loading })
  }, [loading])

  return (
    <Dialog
      fullScreen={isMobile}
      open={open}
      onClose={handleClose}
      sx={{
        '& .MuiDialog-container': {
          alignItems: 'flex-start',
        },
      }}
    >
      <Box width={{ xs: 'inherit', sm: 500 }}>
        <Header titles={['search']} action={handleClose} />
        <Autocomplete
          inputValue={search}
          onInputChange={(e, newValue) => {
            if (
              e?.type === 'change' &&
              (/^[0-9\s\p{L}]+$/u.test(newValue) || newValue === '')
            ) {
              useStore.setState({ search: newValue.toLowerCase() })
              callSearch()
            }
          }}
          options={options.map((option, i) => ({ ...option, i }))}
          loading={loading}
          autoComplete={false}
          clearOnBlur={false}
          ListboxProps={{
            sx: { maxHeight: { xs: '75vh', sm: '80vh' } },
          }}
          fullWidth
          clearIcon={null}
          popupIcon={null}
          sx={{ p: 2 }}
          PopperComponent={({ children, ...props }) => (
            <Popper
              {...props}
              placement="bottom"
              sx={{ height: 0, width: { xs: 'inherit', sm: 500 } }}
            >
              {children}
            </Popper>
          )}
          filterOptions={(o) => o}
          onChange={handleClose}
          renderInput={FancySearch}
          getOptionLabel={(option) =>
            `${option.id}-${searchTab}-${option.with_ar}`
          }
          renderOption={(props, option) => (
            <Grid
              key={`${option.id}-${searchTab}-${option.with_ar}`}
              container
              component="li"
              alignItems="center"
              justifyContent="space-between"
              sx={(theme) => ({
                backgroundColor:
                  option.i % 2
                    ? theme.palette.background.default
                    : theme.palette.grey[
                        theme.palette.mode === 'light' ? 100 : 900
                      ],
              })}
              {...props}
            >
              <Grid
                item
                xs={3}
                sm={2}
                style={{
                  alignItems: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <MemoizedResultImage {...option} searchTab={searchTab} />
              </Grid>
              <Grid item xs={7} sm={8}>
                <Typography variant="caption" style={{ fontWeight: 'bold' }}>
                  {searchTab === 'pokemon'
                    ? `${t(`poke_${option.pokemon_id}`)} ${
                        option.form &&
                        t(`form_${option.form}`) !== t('poke_type_1')
                          ? `(${t(`form_${option.form}`)})`
                          : ''
                      }${option.iv ? ` - ${option.iv}%` : ''}`
                    : option.name || t(getBackupName(searchTab))}
                </Typography>
                <br />
                {option.quest_title && option.quest_target && (
                  <QuestTitle
                    questTitle={option.quest_title}
                    questTarget={option.quest_target}
                  />
                )}
                {!!option.lure_expire_timestamp && (
                  <Typography variant="caption" style={{ fontWeight: 'bold' }}>
                    {new Date(
                      option.lure_expire_timestamp * 1000,
                    ).toLocaleString()}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={2} style={{ textAlign: 'center' }}>
                <Typography variant="caption">
                  {option.distance}{' '}
                  {mapConfig.distanceUnit === 'mi' ? t('mi') : t('km')}
                </Typography>
                <br />
                {searchTab === 'quests' && (
                  <Typography variant="caption" className="ar-task" noWrap>
                    {mapConfig.questMessage ||
                      t(`ar_quest_${Boolean(option.with_ar)}`)}
                  </Typography>
                )}
              </Grid>
            </Grid>
          )}
        />
      </Box>
    </Dialog>
  )
}

function ResultImage(props) {
  const Icons = useStatic((s) => s.Icons)

  if (props.url) {
    return (
      <img
        src={
          props.url.includes('http')
            ? props.url.replace(/^http:\/\//, 'https://')
            : Icons.getMisc(props.searchTab)
        }
        onError={(e) => {
          e.target.onerror = null
          if (props.searchTab === 'pokestops') {
            e.target.src =
              'https://raw.githubusercontent.com/WatWowMap/wwm-uicons-webp/main/pokestop/0.webp'
          } else {
            e.target.src =
              'https://raw.githubusercontent.com/WatWowMap/wwm-uicons-webp/main/gym/0.webp'
          }
        }}
        alt={props.url}
        height={45}
        width={45}
      />
    )
  }
  if (props.quest_reward_type) {
    const { src, amount, tt } = Utility.getRewardInfo(props, Icons)

    return (
      <div
        style={{
          maxHeight: 45,
          maxWidth: 45,
        }}
      >
        <NameTT id={tt}>
          <img
            src={src}
            style={{ maxWidth: 45, maxHeight: 45 }}
            alt={tt}
            onError={(e) => {
              e.target.onerror = null
              e.target.src =
                'https://raw.githubusercontent.com/WatWowMap/wwm-uicons-webp/main/misc/0.webp'
            }}
          />
        </NameTT>
        {!!amount && <div className="search-amount-holder">x{amount}</div>}
      </div>
    )
  }
  if (props.pokemon_id) {
    const { pokemon_id, form, gender, costume, shiny } = props
    return (
      <NameTT id={[form ? `form_${form}` : '', `poke_${pokemon_id}`]}>
        <img
          src={Icons.getPokemon(pokemon_id, form, 0, gender, costume, 0, shiny)}
          alt={form}
          style={{ maxWidth: 45, maxHeight: 45 }}
        />
      </NameTT>
    )
  }
  if (props.raid_pokemon_id) {
    const {
      raid_pokemon_id,
      raid_pokemon_form,
      raid_pokemon_gender,
      raid_pokemon_costume,
      raid_pokemon_evolution,
      raid_pokemon_alignment,
    } = props
    return (
      <NameTT
        id={[
          raid_pokemon_form ? `form_${raid_pokemon_form}` : '',
          raid_pokemon_evolution ? `evo_${raid_pokemon_evolution}` : '',
          `poke_${raid_pokemon_id}`,
        ]}
      >
        <img
          src={Icons.getPokemon(
            raid_pokemon_id,
            raid_pokemon_form,
            raid_pokemon_evolution,
            raid_pokemon_gender,
            raid_pokemon_costume,
            raid_pokemon_alignment,
          )}
          alt={raid_pokemon_id}
          style={{ maxWidth: 45, maxHeight: 45 }}
        />
      </NameTT>
    )
  }
  if (props.lure_id) {
    return (
      <NameTT id={`lure_${props.lure_id}`}>
        <img
          src={Icons.getPokestops(props.lure_id)}
          alt={props.lure_id}
          style={{ maxWidth: 45, maxHeight: 45 }}
        />
      </NameTT>
    )
  }
  return (
    <NameTT
      id={[
        props.nest_pokemon_form ? `form_${props.nest_pokemon_form}` : '',
        `poke_${props.nest_pokemon_id}`,
      ]}
    >
      <img
        src={Icons.getPokemon(props.nest_pokemon_id, props.nest_pokemon_form)}
        alt={props.nest_pokemon_form}
        style={{ maxWidth: 45, maxHeight: 45 }}
      />
    </NameTT>
  )
}

const MemoizedResultImage = React.memo(
  ResultImage,
  (prev, next) => prev.id === next.id,
)

/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable no-nested-ternary */
import * as React from 'react'
import {
  Typography,
  Grid,
  Autocomplete,
  Popper,
  Box,
  ListItemIcon,
  ListItemText,
  TextField,
  CircularProgress,
} from '@mui/material'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import SearchIcon from '@mui/icons-material/Search'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'

import { useTranslation } from 'react-i18next'
import { useQuery } from '@apollo/client'

import NameTT from '@components/popups/common/NameTT'
import { useStore, useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'
import Query from '@services/Query'

import Header from '../general/Header'
import QuestTitle from '../general/QuestTitle'

export function FancySearch({ searchOptions, loading, InputProps, ...props }) {
  const { t } = useTranslation()
  const searchTab = useStore((state) => state.searchTab)
  const Icons = useStatic((s) => s.Icons)

  const { setSearchTab, darkMode } = useStore.getState()

  const [anchorEl, setAnchorEl] = React.useState(null)

  /**
   * @param {string} selection
   */
  const handleClose = (selection) => {
    if (typeof selection === 'string') setSearchTab(selection)
    setAnchorEl(null)
  }

  return (
    <>
      <TextField
        placeholder={t(`global_search_${searchTab}`)}
        variant="standard"
        {...props}
        InputProps={{
          ...InputProps,
          endAdornment: (
            <>
              <IconButton sx={{ p: '10px' }}>
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
              <IconButton
                color="primary"
                sx={{ p: '10px', width: 40 }}
                onClick={(e) => setAnchorEl(e.currentTarget)}
              >
                <img
                  className={darkMode ? '' : 'darken-image'}
                  src={Icons.getMisc(searchTab)}
                  alt={t(searchTab)}
                  style={{ maxWidth: 20, maxHeight: 20 }}
                />
              </IconButton>
            </>
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
        {searchOptions.map((option) => (
          <MenuItem
            key={option}
            selected={option === searchTab}
            onClick={() => handleClose(option)}
          >
            <ListItemIcon>
              <img
                className={darkMode ? '' : 'darken-image'}
                src={Icons.getMisc(option)}
                alt={t(option)}
                style={{ maxWidth: 20, maxHeight: 20 }}
              />
            </ListItemIcon>
            <ListItemText primary={t(option)} />
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

export default function Search({ safeSearch, toggleDialog, isMobile, Icons }) {
  Utility.analytics('/search')

  const { t } = useTranslation()
  const { setSearch } = useStore.getState()
  const location = useStore((state) => state.location)
  const search = useStore((state) => state.search)
  const searchTab = useStore((state) => state.searchTab)
  const { scanAreas } = useStore((state) => state.filters)
  const { map } = useStatic((state) => state.config)

  const [options, setOptions] = React.useState([])

  Utility.analytics('Global Search', `Search Value: ${search}`, searchTab)

  const { data, previousData, loading } = useQuery(Query.search(searchTab), {
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
  })

  const getUrl = (option) => {
    const {
      quest_reward_type,
      nest_pokemon_id,
      nest_pokemon_form,
      raid_pokemon_id,
      pokemon_id,
      lure_id,
    } = option

    if (quest_reward_type) {
      const { src, amount, tt } = Utility.getRewardInfo(option, Icons)

      return (
        <div
          style={{
            maxHeight: 45,
            maxWidth: 45,
            marginLeft: isMobile ? 0 : 17,
            position: 'relative',
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
    if (pokemon_id) {
      const { form, gender, costume, shiny } = option
      return (
        <NameTT id={[form ? `form_${form}` : '', `poke_${pokemon_id}`]}>
          <img
            src={Icons.getPokemon(
              pokemon_id,
              form,
              0,
              gender,
              costume,
              0,
              shiny,
            )}
            alt={nest_pokemon_form}
            style={{ maxWidth: 45, maxHeight: 45 }}
          />
        </NameTT>
      )
    }
    if (raid_pokemon_id) {
      const {
        raid_pokemon_form,
        raid_pokemon_gender,
        raid_pokemon_costume,
        raid_pokemon_evolution,
        raid_pokemon_alignment,
      } = option
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
    if (lure_id) {
      return (
        <NameTT id={`lure_${lure_id}`}>
          <img
            src={Icons.getPokestops(lure_id)}
            alt={lure_id}
            style={{ maxWidth: 45, maxHeight: 45 }}
          />
        </NameTT>
      )
    }
    return (
      <NameTT
        id={[
          nest_pokemon_form ? `form_${nest_pokemon_form}` : '',
          `poke_${nest_pokemon_id}`,
        ]}
      >
        <img
          src={Icons.getPokemon(nest_pokemon_id, nest_pokemon_form)}
          alt={nest_pokemon_form}
          style={{ maxWidth: 45, maxHeight: 45 }}
        />
      </NameTT>
    )
  }

  const getBackupName = () => {
    switch (safeSearch[searchTab]) {
      case 'quests':
      case 'pokestops':
        return t('unknown_pokestop')
      default:
        return t('unknown_gym')
    }
  }

  React.useEffect(() => {
    setOptions(
      (data || previousData)?.[
        searchTab === 'quests'
          ? 'searchQuest'
          : searchTab === 'lures'
          ? 'searchLure'
          : 'search'
      ] || [],
    )
  }, [data])

  return (
    <Box sx={{ width: { xs: 'inherit', sm: 500 } }}>
      <Header titles={['search']} action={toggleDialog(false, '', 'search')} />
      <Autocomplete
        inputValue={search}
        onInputChange={(e, newValue) => {
          if (
            e?.type === 'change' &&
            (/^[0-9\s\p{L}]+$/u.test(newValue) || newValue === '')
          ) {
            setSearch(newValue.toLowerCase())
          }
        }}
        options={options.map((option, i) => ({ ...option, i }))}
        loading={loading}
        autoComplete={false}
        clearOnBlur={false}
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
        onChange={toggleDialog(false, '', 'search')}
        renderInput={(params) => (
          <FancySearch
            {...params}
            searchOptions={safeSearch}
            loading={loading}
          />
        )}
        getOptionLabel={(option) => option.id}
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
              xs={2}
              style={{
                textAlign: 'center',
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'center',
                height: 45,
                width: 45,
              }}
            >
              {option.url ? (
                <img
                  src={
                    option.url.includes('http')
                      ? option.url.replace(/^http:\/\//, 'https://')
                      : Icons.getMisc(searchTab)
                  }
                  style={{ maxHeight: '100%', maxWidth: '100%' }}
                  alt={option.url}
                />
              ) : (
                getUrl(option)
              )}
            </Grid>
            <Grid item xs={8}>
              <Typography variant="caption" style={{ fontWeight: 'bold' }}>
                {searchTab === 'pokemon'
                  ? `${t(`poke_${option.pokemon_id}`)} ${
                      option.form &&
                      t(`form_${option.form}`) !== t('poke_type_1')
                        ? `(${t(`form_${option.form}`)})`
                        : ''
                    }${option.iv ? ` - ${option.iv}%` : ''}`
                  : option.name || getBackupName()}
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
                {map.distanceUnit === 'mi' ? t('mi') : t('km')}
              </Typography>
              <br />
              {searchTab === 'quests' && (
                <Typography variant="caption" className="ar-task" noWrap>
                  {map.questMessage || t(`ar_quest_${Boolean(option.with_ar)}`)}
                </Typography>
              )}
            </Grid>
          </Grid>
        )}
      />
    </Box>
  )
}

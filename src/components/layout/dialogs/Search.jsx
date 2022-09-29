import React from 'react'
import {
  Tabs,
  AppBar,
  Tab,
  TextField,
  Typography,
  Grid,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@apollo/client'

import NameTT from '@components/popups/common/NameTT'
import { useStore, useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'
import Query from '@services/Query'

import Header from '../general/Header'
import QuestTitle from '../general/QuestTitle'

export default function Search({ safeSearch, toggleDialog, isMobile, Icons }) {
  Utility.analytics('/search')

  const { t } = useTranslation()
  const location = useStore((state) => state.location)
  const search = useStore((state) => state.search)
  const setSearch = useStore((state) => state.setSearch)
  const searchTab = useStore((state) => state.searchTab)
  const setSearchTab = useStore((state) => state.setSearchTab)
  const { scanAreas } = useStore((state) => state.filters)
  const { map } = useStatic((state) => state.config)

  const handleTabChange = (event, newValue) => {
    setSearchTab(newValue)
  }
  Utility.analytics(
    'Global Search',
    `Search Value: ${search}`,
    safeSearch[searchTab],
  )

  const { data, previousData } = useQuery(Query.search(safeSearch[searchTab]), {
    variables: {
      search,
      category: safeSearch[searchTab],
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
                  'https://github.com/WatWowMap/wwm-uicons/blob/main/misc/0.png'
              }}
            />
          </NameTT>
          {!!amount && <div className="search-amount-holder">x{amount}</div>}
        </div>
      )
    }
    if (raid_pokemon_id) {
      const {
        raid_pokemon_form,
        raid_pokemon_gender,
        raid_pokemon_costume,
        raid_pokemon_evolution,
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
            )}
            alt={raid_pokemon_id}
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

  const fetchedData = data || previousData
  return (
    <div style={{ width: isMobile ? 'inherit' : 500, minHeight: 190 }}>
      <Header titles={['search']} action={toggleDialog(false, '', 'search')} />
      <AppBar position="static">
        <Tabs
          value={searchTab}
          onChange={handleTabChange}
          indicatorColor="secondary"
          variant="fullWidth"
          style={{ backgroundColor: '#424242', width: '100%' }}
        >
          {safeSearch.map((each) => (
            <Tab
              key={each}
              icon={
                <img
                  src={Icons.getMisc(each)}
                  alt={each}
                  style={{ maxWidth: 20, height: 'auto' }}
                />
              }
              style={{ width: 40, minWidth: 40 }}
            />
          ))}
        </Tabs>
      </AppBar>
      <TextField
        style={{ margin: '15px 10px', width: isMobile ? '93%' : '96%' }}
        autoComplete="off"
        label={t(`global_search_${safeSearch[searchTab]}`)}
        value={search}
        onChange={({ target: { value } }) => {
          if (/^[0-9\s\p{L}]+$/u.test(value) || value === '')
            setSearch(value.toLowerCase())
        }}
        variant="outlined"
      />
      <Grid container>
        {fetchedData?.[
          safeSearch[searchTab] === 'quests' ? 'searchQuest' : 'search'
        ]?.map((option, index) => (
          <Grid
            container
            item
            xs={12}
            key={`${option.id}-${safeSearch[searchTab]}-${option.with_ar}`}
            onClick={toggleDialog(false, '', 'search', option)}
            justifyContent="space-between"
            alignItems="center"
            style={{
              backgroundColor:
                index % 2 ? 'rgba(1, 1, 1, 0.05)' : 'rgba(240, 240, 240, 0.05)',
              padding: '10px 5px',
            }}
          >
            <Grid item xs={2} style={{ textAlign: 'center' }}>
              {option.url ? (
                <img
                  src={
                    option.url.includes('http')
                      ? option.url.replace(/^http:\/\//, 'https://')
                      : Icons.getMisc(safeSearch[searchTab])
                  }
                  style={{ height: 40, width: 45, objectFit: 'fill' }}
                  alt={option.url}
                />
              ) : (
                getUrl(option)
              )}
            </Grid>
            <Grid item xs={8}>
              <Typography variant="caption" style={{ fontWeight: 'bold' }}>
                {option.name || getBackupName()}
              </Typography>
              <br />
              {option.quest_title && option.quest_target && (
                <QuestTitle
                  questTitle={option.quest_title}
                  questTarget={option.quest_target}
                />
              )}
            </Grid>
            <Grid item xs={2} style={{ textAlign: 'center' }}>
              <Typography variant="caption">
                {option.distance}{' '}
                {map.distanceUnit === 'mi' ? t('mi') : t('km')}
              </Typography>
              <br />
              {safeSearch[searchTab] === 'quests' && (
                <Typography variant="caption" className="ar-task" noWrap>
                  {map.questMessage || t(`ar_quest_${Boolean(option.with_ar)}`)}
                </Typography>
              )}
            </Grid>
          </Grid>
        ))}
      </Grid>
    </div>
  )
}

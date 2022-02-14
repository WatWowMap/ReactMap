/* eslint-disable camelcase */
import React from 'react'
import {
  Tabs, AppBar, Tab, TextField, Typography, Grid,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@apollo/client'

import Utility from '@services/Utility'
import { useStore } from '@hooks/useStore'
import Query from '@services/Query'
import Header from '../general/Header'
import QuestTitle from '../general/QuestTitle'

export default function Search({
  safeSearch, toggleDialog, isMobile, Icons,
}) {
  Utility.analytics('/search')

  const { t } = useTranslation()
  const location = useStore(state => state.location)
  const search = useStore(state => state.search)
  const setSearch = useStore(state => state.setSearch)
  const searchTab = useStore(state => state.searchTab)
  const setSearchTab = useStore(state => state.setSearchTab)

  const handleTabChange = (event, newValue) => {
    setSearchTab(newValue)
  }
  Utility.analytics('Global Search', `Search Value: ${search}`, safeSearch[searchTab])

  const { data, previousData } = useQuery(Query.search(safeSearch[searchTab]), {
    variables: {
      search,
      category: safeSearch[searchTab],
      lat: location[0],
      lon: location[1],
      locale: localStorage.getItem('i18nextLng'),
      ts: Math.floor(Date.now() / 1000),
      midnight: Utility.getMidnight(),
    },
  })

  const getUrl = (option) => {
    const {
      quest_reward_type, nest_pokemon_id, nest_pokemon_form, raid_pokemon_id,
    } = option

    if (quest_reward_type) {
      const {
        quest_pokemon_id, quest_form_id, quest_gender_id, quest_costume_id, quest_shiny,
        quest_item_id, item_amount, stardust_amount, candy_amount, xl_candy_amount,
        mega_pokemon_id, mega_amount, candy_pokemon_id, xl_candy_pokemon_id,
      } = option
      let main
      let amount = 0
      switch (quest_reward_type) {
        case 2:
          main = Icons.getRewards(quest_reward_type, quest_item_id, item_amount)
          amount = main.includes('_a') || item_amount <= 1 ? 0 : item_amount; break
        case 3:
          main = Icons.getRewards(quest_reward_type, stardust_amount)
          amount = main.includes('_a') ? 0 : stardust_amount; break
        case 4:
          main = Icons.getRewards(quest_reward_type, candy_pokemon_id)
          amount = main.includes('_a') ? 0 : candy_amount; break
        case 7:
          main = Icons.getPokemon(
            quest_pokemon_id, quest_form_id, 0, quest_gender_id, quest_costume_id, quest_shiny,
          ); break
        case 9:
          main = Icons.getRewards(quest_reward_type, xl_candy_pokemon_id)
          amount = main.includes('_a') ? 0 : xl_candy_amount; break
        case 12:
          main = Icons.getRewards(quest_reward_type, mega_pokemon_id, mega_amount)
          amount = main.includes('_a') ? 0 : mega_amount; break
        default:
          main = Icons.getRewards(quest_reward_type)
      }
      return (
        <div style={{
          maxHeight: 45, maxWidth: 45, marginLeft: isMobile ? 0 : 17, position: 'relative',
        }}
        >
          <img src={main} style={{ maxWidth: 45, maxHeight: 45 }} />
          {Boolean(main.includes('stardust') ? !main.endsWith('0.png') : !main.includes('_a') && amount)
            && <div className="search-amount-holder">x{amount}</div>}
        </div>
      )
    }
    if (raid_pokemon_id) {
      const {
        raid_pokemon_form, raid_pokemon_gender, raid_pokemon_costume, raid_pokemon_evolution,
      } = option
      return (
        <img
          src={Icons.getPokemon(
            raid_pokemon_id, raid_pokemon_form, raid_pokemon_evolution, raid_pokemon_gender, raid_pokemon_costume,
          )}
          style={{ maxWidth: 45, maxHeight: 45 }}
        />
      )
    }
    return <img src={Icons.getPokemon(nest_pokemon_id, nest_pokemon_form)} style={{ maxWidth: 45, maxHeight: 45 }} />
  }

  const getBackupName = () => {
    switch (safeSearch[searchTab]) {
      case 'quests':
      case 'pokestops': return t('unknown_pokestop')
      default: return t('unknown_gym')
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
          {safeSearch.map(each => (
            <Tab
              key={each}
              icon={<img src={Icons.getMisc(each)} style={{ maxWidth: 20, height: 'auto' }} />}
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
          if (/^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s\p{L}]+$/u.test(value) || value === '') setSearch(value.toLowerCase())
        }}
        variant="outlined"
      />
      <Grid container>
        {fetchedData?.[safeSearch[searchTab] === 'quests' ? 'searchQuest' : 'search']?.map((option, index) => (
          <Grid
            container
            item
            xs={12}
            key={`${option.id}-${safeSearch[searchTab]}-${option.with_ar}`}
            onClick={toggleDialog(false, '', 'search', option)}
            justifyContent="space-between"
            alignItems="center"
            style={{ backgroundColor: index % 2 ? 'rgba(1, 1, 1, 0.05)' : 'rgba(240, 240, 240, 0.05)', height: 50 }}
          >
            <Grid item xs={2} style={{ textAlign: 'center' }}>
              {option.url
                ? <img src={option.url.includes('http') ? option.url : Icons.getMisc(safeSearch[searchTab])} style={{ height: 40, width: 45, objectFit: 'fill' }} />
                : getUrl(option)}
            </Grid>
            <Grid item xs={8}>
              <Typography variant="caption" style={{ fontWeight: 'bold' }}>
                {option.name || getBackupName()}
              </Typography>
              <br />
              {(option.quest_title && option.quest_target) && (
                <QuestTitle
                  questTitle={option.quest_title}
                  questTarget={option.quest_target}
                />
              )}
            </Grid>
            <Grid item xs={2}>
              <Typography variant="caption">{option.distance}{t('km')}</Typography>
            </Grid>
          </Grid>
        ))}
      </Grid>
    </div>
  )
}

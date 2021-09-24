/* eslint-disable camelcase */
import React from 'react'
import {
  DialogTitle, IconButton, Tabs, AppBar, Tab, TextField, Typography, Grid,
} from '@material-ui/core'
import { Clear } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@apollo/client'

import Utility from '@services/Utility'
import { useStore } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'
import Query from '@services/Query'

export default function Search({
  safeSearch, toggleDialog, isMobile, Icons,
}) {
  Utility.analytics('/search')

  const { t } = useTranslation()
  const classes = useStyles()
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
    },
  })

  const getUrl = (option) => {
    const {
      quest_reward_type, nest_pokemon_id, nest_pokemon_form, raid_pokemon_id,
    } = option

    if (quest_reward_type) {
      const {
        quest_pokemon_id, quest_form_id, quest_gender_id, quest_costume_id, quest_shiny,
        quest_item_id, item_amount, stardust_amount,
        mega_pokemon_id, mega_amount, candy_pokemon_id,
      } = option
      let main
      switch (quest_reward_type) {
        case 2:
          main = Icons.getRewards(quest_reward_type, quest_item_id, item_amount); break
        case 3:
          main = Icons.getRewards(quest_reward_type, stardust_amount); break
        case 4:
          main = Icons.getRewards(quest_reward_type, candy_pokemon_id); break
        case 7:
          main = Icons.getPokemon(
            quest_pokemon_id, quest_form_id, 0, quest_gender_id, quest_costume_id, quest_shiny,
          ); break
        case 12:
          main = Icons.getRewards(quest_reward_type, mega_pokemon_id, mega_amount); break
        default:
          main = Icons.getRewards(quest_reward_type)
      }
      return (
        <div style={{
          maxHeight: 45, maxWidth: 45, marginLeft: isMobile ? 0 : 17, position: 'relative',
        }}
        >
          <img src={main} style={{ maxWidth: 45, maxHeight: 45 }} />
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
      default: return t('unknownGym')
      case 'quests':
      case 'pokestops': return t('unknownPokestop')
    }
  }

  const fetchedData = data || previousData
  return (
    <div style={{ width: isMobile ? '80vw' : 500, minHeight: 190 }}>
      <DialogTitle className={classes.filterHeader}>
        {t('search')}
        <IconButton
          onClick={toggleDialog(false, '', 'search')}
          style={{ position: 'absolute', right: 5, top: 5 }}
        >
          <Clear style={{ color: 'white' }} />
        </IconButton>
      </DialogTitle>
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
              icon={<img src={`/images/misc/${each}.png`} style={{ maxWidth: 20, height: 'auto' }} />}
              style={{ width: 40, minWidth: 40 }}
            />
          ))}
        </Tabs>
      </AppBar>
      <TextField
        style={{ margin: '15px 10px', width: isMobile ? '93%' : '96%' }}
        autoComplete="off"
        label={t(`${safeSearch[searchTab]}Search`)}
        value={search}
        onChange={(event) => setSearch(event.target.value.toLowerCase())}
        variant="outlined"
      />
      <Grid container>
        {fetchedData && fetchedData.search.map((option, index) => (
          <Grid
            container
            item
            xs={12}
            key={`${option.id}-${safeSearch[searchTab]}`}
            onClick={toggleDialog(false, '', 'search', option)}
            justifyContent="space-between"
            alignItems="center"
            style={{ backgroundColor: index % 2 ? 'rgba(1, 1, 1, 0.05)' : 'rgba(240, 240, 240, 0.05)', height: 50 }}
          >
            <Grid item xs={2} style={{ textAlign: 'center' }}>
              {option.url
                ? <img src={option.url.includes('http') ? option.url : `images/misc/${safeSearch[searchTab]}.png`} style={{ height: 45, width: 45, objectFit: 'fill' }} />
                : getUrl(option)}
            </Grid>
            <Grid item xs={8}>
              <Typography variant="caption">
                {option.name || getBackupName()}
              </Typography>
            </Grid>
            <Grid item xs={2}>
              <Typography variant="caption">{option.distance}km</Typography>
            </Grid>
          </Grid>
        ))}
      </Grid>
    </div>
  )
}

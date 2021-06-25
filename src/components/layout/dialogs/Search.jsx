/* eslint-disable camelcase */
import React, { useState } from 'react'
import {
  DialogTitle, IconButton, Tabs, AppBar, Tab, TextField, Typography, Grid,
} from '@material-ui/core'
import { Clear } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@apollo/client'

import { useStore, useStatic } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'
import Query from '@services/Query'
import Utility from '@services/Utility'

export default function Search({ safeSearch, toggleDialog, isMobile }) {
  const { t } = useTranslation()
  const classes = useStyles()
  const availableForms = useStatic(state => state.availableForms)
  const { icons } = useStatic(state => state.config)
  const { icons: userIcons } = useStore(state => state.settings)
  const location = useStore(state => state.location)
  const search = useStore(state => state.search)
  const setSearch = useStore(state => state.setSearch)
  const [openTab, setOpenTab] = useState(0)

  const handleTabChange = (event, newValue) => {
    setOpenTab(newValue)
  }

  const { data, previousData } = useQuery(Query.search(), {
    variables: {
      search,
      category: safeSearch[openTab],
      lat: location[0],
      lon: location[1],
      locale: localStorage.getItem('i18nextLng'),
    },
  })

  const getPokemonUrl = (id, form, mega, gender, costume, shiny) => (
    `${icons[userIcons].path}/${Utility.getPokemonIcon(availableForms, id, form, mega, gender, costume, shiny)}.png`
  )

  const getUrl = (option) => {
    const { quest_reward_type, quest_pokemon_id, quest_form_id } = option

    if (quest_reward_type) {
      const {
        quest_item_id, item_amount, quest_gender_id, quest_costume_id, quest_shiny,
        stardust_amount, mega_pokemon_id, mega_amount, candy_pokemon_id, candy_amount,
      } = option
      let main
      let secondary
      let amount
      switch (quest_reward_type) {
        default: main = '/images/item/-0.png'; break
        case 1:
          main = '/images/item/-2.png'
          amount = item_amount > 1 ? item_amount : undefined; break
        case 2:
          main = `/images/item/${quest_item_id}.png`
          amount = item_amount > 1 ? item_amount : undefined; break
        case 3:
          main = '/images/item/-1.png'
          amount = stardust_amount > 1 ? stardust_amount : undefined; break
        case 4:
          main = getPokemonUrl(candy_pokemon_id)
          secondary = '/images/item/-3.png'
          amount = candy_amount > 1 ? candy_amount : undefined; break
        case 5: main = '/images/item/-4.png'; break
        case 6: main = '/images/item/-5.png'; break
        case 7:
          main = getPokemonUrl(
            quest_pokemon_id, quest_form_id, 0, quest_gender_id, quest_costume_id, quest_shiny,
          ); break
        case 8: main = '/images/item/-6.png'; break
        case 11: main = '/images/item/-7.png'; break
        case 12:
          main = getPokemonUrl(mega_pokemon_id, 0, mega_pokemon_id === 6 || mega_pokemon_id === 150 ? 2 : 1)
          secondary = '/images/item/-8.png'
          amount = mega_amount > 1 ? mega_amount : undefined; break
      }
      return (
        <div style={{ maxHeight: 45, maxWidth: 45, position: 'relative' }}>
          <img src={main} style={{ maxWidth: 45, maxHeight: 45 }} />
          {secondary && (
            <img
              src={secondary}
              style={{
                position: 'absolute',
                maxWidth: '40%',
                maxHeight: '40%',
                bottom: 0,
                left: 5,
              }}
            />
          )}
          {amount && (
            <div
              style={{
                position: 'absolute',
                maxWidth: '50%',
                maxHeight: '50%',
                bottom: 0,
                right: secondary || amount < 100 ? 0 : '25%',
                color: 'white',
                textShadow: '#000 0 0 1px, #000 0 0 1px, #000 0 0 1px, #000 0 0 1px, #000 0 0 1px, #000 0 0 1px',
                fontWeight: 700,
                font: 'bold 15px/13px Helvetica, Verdana, Tahoma',
              }}
            >
              x{amount}
            </div>
          )}
        </div>
      )
    }
    return (
      <img src={getPokemonUrl(quest_pokemon_id, quest_form_id)} style={{ maxWidth: 45, maxHeight: 45 }} />
    )
  }

  const fetchedData = data || previousData
  console.log(fetchedData)
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
          value={openTab}
          onChange={handleTabChange}
          indicatorColor="secondary"
          variant="fullWidth"
          style={{ backgroundColor: '#424242', width: '100%' }}
        >
          {safeSearch.map(each => (
            <Tab
              key={each}
              icon={<img src={`/images/misc/${each}.png`} style={{ maxWidth: 20, height: 'auto' }} />}
              style={{ width: 50, minWidth: 50 }}
            />
          ))}
        </Tabs>
      </AppBar>
      <TextField
        style={{ margin: '15px 10px', width: isMobile ? '93%' : '96%' }}
        autoComplete="off"
        label={t(`${safeSearch[openTab]}Search`)}
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
            key={`${option.name}-${option.lat}-${option.lon}`}
            onClick={toggleDialog(false, '', 'search', option)}
            justify="space-between"
            alignItems="center"
            style={{ backgroundColor: index % 2 ? 'rgba(1, 1, 1, 0.05)' : 'rgba(240, 240, 240, 0.05)', height: 50 }}
          >
            <Grid item xs={2} style={{ textAlign: 'center' }}>
              {option.quest_reward_type || option.quest_pokemon_id !== null
                ? getUrl(option)
                : <img src={option.url} style={{ height: 45, width: 45, objectFit: 'fill' }} />}
            </Grid>
            <Grid item xs={8}>
              <Typography variant="caption">{option.name}</Typography>
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

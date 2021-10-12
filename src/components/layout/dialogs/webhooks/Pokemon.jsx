import React, { useEffect, useState, memo } from 'react'
import { useMutation } from '@apollo/client'

import Query from '@services/Query'
import ReactWindow from '@components/layout/general/ReactWindow'
import PokemonTile from './tiles/PoraclePokemon'
import Selecting from './Selecting'

const pvpFields = ['pvp_ranking_league', 'pvp_ranking_best', 'pvp_ranking_worst', 'pvp_ranking_min_cp']
const ignoredFields = ['noIv', 'byDistance', 'xs', 'xl', 'allForms', 'pvpEntry']

const processPokemon = (pokemon, defaults) => pokemon.map(pkmn => {
  const fields = ['pokemon_id', 'form', 'clean', 'distance', 'min_time', 'template', 'profile_no', 'gender', 'rarity', 'max_rarity']
  const newPokemon = {}
  if (pkmn.allForms) {
    pkmn.form = 0
  }
  if (pkmn.pvpEntry) {
    fields.push(...pvpFields)
  } else {
    fields.push(...Object.keys(pkmn).filter(key => !pvpFields.includes(key) && !ignoredFields.includes(key)))
  }
  fields.forEach(field => newPokemon[field] = pkmn[field] || defaults[field])
  return newPokemon
})

const WebhookPokemon = ({
  isMobile, webhookData, selectedWebhook, Icons, send, setSend, tempFilters, setTempFilters, setWebhookData,
}) => {
  const [syncWebhook, { data: newWebhookData }] = useMutation(Query.webhook('pokemon'))
  const [currentPokemon, setCurrentPokemon] = useState(webhookData[selectedWebhook].pokemon)
  const [selected, setSelected] = useState({})

  useEffect(() => {
    if (newWebhookData?.webhook?.pokemon) {
      setCurrentPokemon(newWebhookData.webhook.pokemon)
    }
  }, [newWebhookData])

  useEffect(() => {
    if (send) {
      setSend(false)
      setTempFilters({})
      syncWebhook({
        variables: {
          category: 'pokemon',
          data: processPokemon(
            Object.values(tempFilters).filter(x => x.enabled), webhookData[selectedWebhook].info.pokemon.defaults,
          ),
          name: selectedWebhook,
          status: 'POST',
        },
      })
    }
  }, [send])

  useEffect(() => () => setWebhookData({
    ...webhookData,
    [selectedWebhook]: {
      ...webhookData[selectedWebhook],
      pokemon: currentPokemon,
    },
  }))

  const handleAll = () => {
    const newPokemon = {}
    currentPokemon.forEach(entry => {
      newPokemon[entry.uid] = true
    })
    setSelected(newPokemon)
  }
  return (
    <>
      <ReactWindow
        columnCount={1}
        length={currentPokemon.length}
        offset={15}
        data={{
          isMobile,
          Icons,
          tileItem: currentPokemon.sort((a, b) => a.pokemon_id - b.pokemon_id),
          syncWebhook,
          selectedWebhook,
          currentPokemon,
          setCurrentPokemon,
          selected,
          setSelected,
          setSend,
          setTempFilters,
          leagues: webhookData[selectedWebhook].info.pokemon.leagues,
        }}
        Tile={PokemonTile}
      />
      {Object.values(selected).some(x => x) && (
        <Selecting setSelected={setSelected} handleAll={handleAll} />
      )}
    </>
  )
}

const areEqual = (prev, next) => {
  const prevSelected = prev.webhookData[prev.selectedWebhook]
  const nextSelected = next.webhookData[next.selectedWebhook]
  return prevSelected.pokemon.length === nextSelected.pokemon.length
    && prevSelected.fetched === nextSelected.fetched
    && prev.send === next.send
    && prev.isMobile === next.isMobile
}

export default memo(WebhookPokemon, areEqual)

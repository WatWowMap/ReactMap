import React, {
  useState, useEffect, memo,
} from 'react'
import { useMutation } from '@apollo/client'

import Query from '@services/Query'
import ReactWindow from '@components/layout/general/ReactWindow'
import PokemonTile from './tiles/PokemonTile'

const WebhookPokemon = ({
  isMobile, t, webhookData, selectedWebhook, Icons,
}) => {
  const [syncWebhook, { data: newWebhookData }] = useMutation(Query.webhook('setPokemon'))

  const [currentPokemon, setCurrentPokemon] = useState(webhookData[selectedWebhook].pokemon)

  useEffect(() => {
    if (newWebhookData && newWebhookData.webhook) {
      setCurrentPokemon(newWebhookData.webhook.pokemon)
    }
  }, [newWebhookData])

  console.log(currentPokemon)
  return (
    <ReactWindow
      columnCount={1}
      length={currentPokemon.length}
      offset={15}
      data={{
        isMobile,
        Icons,
        tileItem: currentPokemon.sort((a, b) => a.pokemon_id - b.pokemon_id),
        syncWebhook,
      }}
      Tile={PokemonTile}
    />
  )
}

// const areEqual = (prev, next) => {
//   const prevSelected = prev.webhookData[prev.selectedWebhook]
//   const nextSelected = next.webhookData[next.selectedWebhook]
//   return true
// }

// export default memo(WebhookPokemon, areEqual)
export default WebhookPokemon

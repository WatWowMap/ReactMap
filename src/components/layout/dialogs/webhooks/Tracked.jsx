import React, { useEffect, useState, memo } from 'react'
import { useMutation } from '@apollo/client'

import Query from '@services/Query'
import { useStatic } from '@hooks/useStore'
import ReactWindow from '@components/layout/general/ReactWindow'

import PokemonTile from './tiles/PoraclePokemon'
import Selecting from './Selecting'

const Tracked = ({
  isMobile, webhookData, selectedWebhook, Icons, send, setSend,
  tempFilters, setTempFilters, setWebhookData, category, Poracle,
}) => {
  const [syncWebhook, { data: newWebhookData }] = useMutation(Query.webhook(category))
  const [tracked, setTracked] = useState(webhookData[selectedWebhook][category])
  const [selected, setSelected] = useState({})
  const [staticInfo] = useState(webhookData[selectedWebhook].info)
  const { invasions } = useStatic(s => s.masterfile)

  useEffect(() => {
    if (newWebhookData?.webhook?.[category]) {
      setTracked(newWebhookData.webhook[category])
    }
  }, [newWebhookData])

  useEffect(() => {
    if (send) {
      setSend(false)
      setTempFilters(
        Object.fromEntries(
          Object.entries(tempFilters).map(([key, value]) => [key, { ...value, enabled: false }]),
        ),
      )
      syncWebhook({
        variables: {
          category,
          data: Poracle.processor(
            category, Object.values(tempFilters).filter(x => x.enabled), staticInfo[category].defaults,
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
      [category]: tracked,
    },
  }))

  const handleAll = () => {
    const newObj = {}
    tracked.forEach(entry => {
      newObj[entry.uid] = true
    })
    setSelected(newObj)
  }
  return (
    <>
      <ReactWindow
        columnCount={1}
        length={tracked.length}
        offset={15}
        data={{
          isMobile,
          Icons,
          tileItem: tracked.sort((a, b) => a[staticInfo[category].sortProp] - b[staticInfo[category].sortProp]),
          syncWebhook,
          selectedWebhook,
          tracked,
          setTracked,
          selected,
          setSelected,
          setSend,
          setTempFilters,
          leagues: staticInfo.pokemon.leagues,
          category,
          Poracle,
          invasions,
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
  return prevSelected[prev.category].length === nextSelected[next.category].length
    && prevSelected.fetched === nextSelected.fetched
    && prev.send === next.send
    && prev.isMobile === next.isMobile
}

export default memo(Tracked, areEqual)

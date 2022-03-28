import React, { useEffect, useState, memo } from 'react'
import { useMutation } from '@apollo/client'
import { Trans } from 'react-i18next'

import Utility from '@services/Utility'
import Query from '@services/Query'
import { useStatic } from '@hooks/useStore'
import { Grid, Typography } from '@material-ui/core'
import ReactWindow from '@components/layout/general/ReactWindow'
import AdvSearch from '@components/layout/dialogs/filters/AdvSearch'
import PokemonTile from './tiles/TrackedTile'
import Selecting from './Selecting'

const Tracked = ({
  isMobile, webhookData, selectedWebhook, Icons, send, setSend,
  tempFilters, setTempFilters, setWebhookData, category, Poracle,
  setWebhookAlert, t,
}) => {
  const [syncWebhook, { data: newWebhookData }] = useMutation(Query.webhook(category), {
    fetchPolicy: 'no-cache',
  })
  const [search, setSearch] = useState('')
  const [tracked, setTracked] = useState(webhookData[selectedWebhook][category])
  const [selected, setSelected] = useState({})
  const [staticInfo] = useState(webhookData[selectedWebhook].info)
  const { invasions } = useStatic(s => s.masterfile)
  const profileFiltered = tracked.filter(x => x.profile_no === webhookData[selectedWebhook].human.current_profile_no)
    .sort((a, b) => a[staticInfo[category].sortProp] - b[staticInfo[category].sortProp])
  const [profileFilteredFinal, setProfileFilteredFinal] = useState(profileFiltered)

  useEffect(() => {
    if (newWebhookData?.webhook?.[category]) {
      setTracked(newWebhookData.webhook[category])
    }
    if (newWebhookData?.webhook?.status === 'error') {
      setWebhookAlert({
        open: true,
        severity: newWebhookData.webhook.status,
        message: <Trans i18nKey={newWebhookData.webhook.message}>{{ name: selectedWebhook }}</Trans>,
      })
    }
  }, [newWebhookData])

  useEffect(() => {
    if (send) {
      setSend(false)
      setTempFilters(
        Object.fromEntries(
          Object.entries(tempFilters || {}).map(([key, value]) => [key, { ...value, enabled: false }]),
        ),
      )
      syncWebhook({
        variables: {
          category,
          data: Poracle.processor(
            category,
            Object.values(tempFilters || {}).filter(x => x && x.enabled),
            staticInfo[category].defaults,
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

  useEffect(() => {
    if (search) {
      setProfileFilteredFinal(profileFiltered
        .filter(x => (x.description && x.description.toLowerCase().includes(search))
          || (x.pokemon_id && x.pokemon_id.toString().includes(search))))
    } else {
      setProfileFilteredFinal(profileFiltered)
    }
  }, [search])

  const handleAll = () => {
    const newObj = {}
    tracked.forEach(entry => {
      newObj[entry.uid] = true
    })
    setSelected(newObj)
  }

  const deleteAll = () => {
    syncWebhook({
      variables: {
        category: `${category}-delete`,
        data: Object.keys(selected).filter(x => selected[x]),
        name: selectedWebhook,
        status: 'POST',
      },
    })
    setSelected({})
  }

  return (
    <div style={{ height: '95%' }}>
      {['pokemon', 'raid', 'egg', 'gym'].includes(category) ? (
        <AdvSearch
          search={search}
          setSearch={setSearch}
          category={category}
        />
      ) : null}
      {profileFilteredFinal.length ? (
        <ReactWindow
          columnCount={1}
          length={profileFilteredFinal.length}
          offset={0}
          columnWidthCorrection={20}
          data={{
            isMobile,
            Icons,
            tileItem: profileFilteredFinal,
            syncWebhook,
            selectedWebhook,
            tracked,
            setTracked,
            selected,
            setSelected,
            setSend,
            setTempFilters,
            leagues: webhookData[selectedWebhook].leagues,
            category,
            Poracle,
            invasions,
            t,
            Utility,
          }}
          Tile={PokemonTile}
        />
      ) : (
        <div style={{ flex: '1 1 auto' }}>
          <Grid container alignItems="center" justifyContent="center" direction="column" style={{ height: '100%' }}>
            <Grid item style={{ whiteSpace: 'pre-line' }}>
              <Typography variant="h6" align="center">
                {t('no_alerts')}
              </Typography>
            </Grid>
          </Grid>
        </div>
      )}
      {Object.values(selected).some(x => x) && (
        <Selecting setSelected={setSelected} handleAll={handleAll} deleteAll={deleteAll} />
      )}
    </div>
  )
}

const areEqual = (prev, next) => {
  const prevSelected = prev.webhookData[prev.selectedWebhook]
  const nextSelected = next.webhookData[next.selectedWebhook]
  return prevSelected[prev.category].length === nextSelected[next.category].length
    && prev.addNew === next.addNew
    && prevSelected.human.current_profile_no === nextSelected.human.current_profile_no
    && prevSelected.fetched === nextSelected.fetched
    && prev.send === next.send
    && prev.isMobile === next.isMobile
}

export default memo(Tracked, areEqual)

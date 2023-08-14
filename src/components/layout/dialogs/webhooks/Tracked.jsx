import * as React from 'react'
import { useMutation } from '@apollo/client'
import { Trans, useTranslation } from 'react-i18next'

import Poracle from '@services/Poracle'
import Query from '@services/Query'
import { useStatic } from '@hooks/useStore'
import { Grid, Typography } from '@mui/material'
import ReactWindow from '@components/layout/general/ReactWindow'
import AdvSearch from '@components/layout/dialogs/filters/AdvSearch'
import PokemonTile from './tiles/TrackedTile'
import Selecting from './Selecting'
import { useWebhookStore } from './store'

const Tracked = ({
  // isMobile,
  // selectedWebhook,
  // send,
  // setSend,
  // tempFilters,
  // setTempFilters,
  category,
}) => {
  return null
  const { t } = useTranslation()
  const Icons = useStatic((s) => s.Icons)
  const webhookData = useWebhookStore((s) => s.data)

  const [syncWebhook, { data: newWebhookData }] = useMutation(
    Query.webhook(category),
    {
      fetchPolicy: 'no-cache',
    },
  )
  const [search, setSearch] = React.useState('')
  const [tracked, setTracked] = React.useState(
    webhookData[selectedWebhook][category],
  )
  const [selected, setSelected] = React.useState({})
  const [staticInfo] = React.useState(webhookData[selectedWebhook].info)
  const { invasions } = React.useStatic((s) => s.masterfile)

  React.useEffect(() => {
    if (newWebhookData?.webhook?.[category]) {
      setTracked(newWebhookData.webhook[category])
    }
    if (newWebhookData?.webhook?.status === 'error') {
      useStatic.setState({
        webhookAlert: {
          open: true,
          severity: newWebhookData.webhook.status,
          message: (
            <Trans i18nKey={newWebhookData.webhook.message}>
              {{ name: selectedWebhook }}
            </Trans>
          ),
        },
      })
    }
  }, [newWebhookData])

  React.useEffect(() => {
    if (send) {
      setSend(false)
      setTempFilters(
        Object.fromEntries(
          Object.entries(tempFilters || {}).map(([key, value]) => [
            key,
            { ...value, enabled: false },
          ]),
        ),
      )
      syncWebhook({
        variables: {
          category,
          data: Poracle.processor(
            category,
            Object.values(tempFilters || {}).filter((x) => x && x.enabled),
            staticInfo[category].defaults,
          ),
          name: selectedWebhook,
          status: 'POST',
        },
      })
    }
  }, [send])

  React.useEffect(
    () => () =>
      useWebhookStore.setState((prev) => ({
        data: {
          ...prev.data,
          [selectedWebhook]: {
            ...prev.data[selectedWebhook],
            [category]: tracked,
          },
        },
      })),
  )

  const profileFiltered = React.useMemo(
    () =>
      tracked
        .filter(
          (x) =>
            x.profile_no ===
            webhookData[selectedWebhook].human.current_profile_no,
        )
        .map((y) => ({
          ...y,
          description:
            Poracle.generateDescription(
              y,
              category,
              webhookData[selectedWebhook].leagues,
              t,
            )?.replace(/\*/g, '') || '',
        }))
        .sort(
          (a, b) =>
            a[staticInfo[category].sortProp] - b[staticInfo[category].sortProp],
        ),
    [tracked, webhookData[selectedWebhook].human.current_profile_no],
  )

  const searchFiltered = profileFiltered.filter(
    (x) =>
      x.description.toLowerCase().includes(search) ||
      (x.pokemon_id && x.pokemon_id?.toString()?.includes(search)),
  )

  const handleAll = () => {
    const newObj = {}
    tracked.forEach((entry) => {
      newObj[entry.uid] = true
    })
    setSelected(newObj)
  }

  const deleteAll = () => {
    syncWebhook({
      variables: {
        category: `${category}-delete`,
        data: Object.keys(selected).filter((x) => selected[x]),
        name: selectedWebhook,
        status: 'POST',
      },
    })
    setSelected({})
  }

  return (
    <div style={{ height: '95%' }}>
      <AdvSearch search={search} setSearch={setSearch} category={category} />
      {searchFiltered.length ? (
        <ReactWindow
          columnCount={1}
          length={searchFiltered.length}
          offset={0}
          columnWidthCorrection={18}
          data={{
            isMobile,
            Icons,
            tileItem: searchFiltered,
            syncWebhook,
            selectedWebhook,
            tracked,
            setTracked,
            selected,
            setSelected,
            setSend,
            setTempFilters,
            category,
            invasions,
          }}
          Tile={PokemonTile}
        />
      ) : (
        <div style={{ flex: '1 1 auto' }}>
          <Grid
            container
            alignItems="center"
            justifyContent="center"
            direction="column"
            style={{ height: '100%' }}
          >
            <Grid item style={{ whiteSpace: 'pre-line' }}>
              <Typography variant="h6" align="center">
                {t('no_alerts')}
              </Typography>
            </Grid>
          </Grid>
        </div>
      )}
      {Object.values(selected).some((x) => x) && (
        <Selecting
          setSelected={setSelected}
          handleAll={handleAll}
          deleteAll={deleteAll}
        />
      )}
    </div>
  )
}

export default Tracked

// const areEqual = (prev, next) => {
//   const prevSelected = prev.webhookData[prev.selectedWebhook]
//   const nextSelected = next.webhookData[next.selectedWebhook]
//   return (
//     prevSelected[prev.category].length === nextSelected[next.category].length &&
//     prev.addNew === next.addNew &&
//     prevSelected.human.current_profile_no ===
//       nextSelected.human.current_profile_no &&
//     prevSelected.fetched === nextSelected.fetched &&
//     prev.send === next.send &&
//     prev.isMobile === next.isMobile
//   )
// }

// export default React.memo(Tracked, areEqual)

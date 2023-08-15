/* eslint-disable react/no-unstable-nested-components */
// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Virtuoso } from 'react-virtuoso'
import Typography from '@mui/material/Typography'

import Box from '@mui/material/Box'
import AdvSearch from '@components/layout/dialogs/filters/AdvSearch'
import TrackedTile from './tiles/TrackedTile'
import Selecting from './Selecting'
import { useWebhookStore, setTrackedSearch } from './store'
import { useGetWebhookData } from './hooks'

/**
 *
 * @param {{ category: Exclude<import('./store').WebhookStore['category'], 'human'>, visible: import('./store').WebhookStore['category'] }} props
 * @returns
 */
const Tracked = ({ category, visible }) => {
  const { t } = useTranslation()

  const { data: tracked } = useGetWebhookData(category)
  const trackedSearch = useWebhookStore((s) => s.trackedSearch)

  console.log(useWebhookStore.getState())
  // React.useEffect(() => {
  //   if (send) {
  //     setSend(false)
  //     setTempFilters(
  //       Object.fromEntries(
  //         Object.entries(tempFilters || {}).map(([key, value]) => [
  //           key,
  //           { ...value, enabled: false },
  //         ]),
  //       ),
  //     )
  //     syncWebhook({
  //       variables: {
  //         category,
  //         data: Poracle.processor(
  //           category,
  //           Object.values(tempFilters || {}).filter((x) => x && x.enabled),
  //           staticInfo[category].defaults,
  //         ),
  //         name: selectedWebhook,
  //         status: 'POST',
  //       },
  //     })
  //   }
  // }, [send])

  // React.useEffect(
  //   () => () =>
  //     useWebhookStore.setState((prev) => ({
  //       data: {
  //         ...prev.data,
  //         [selectedWebhook]: {
  //           ...prev.data[selectedWebhook],
  //           [category]: tracked,
  //         },
  //       },
  //     })),
  // )

  // const profileFiltered = React.useMemo(
  //   () =>
  //     tracked
  //       .filter(
  //         (x) =>
  //           x.profile_no ===
  //           webhookData[selectedWebhook].human.current_profile_no,
  //       )
  //       .map((y) => ({
  //         ...y,
  //         description:
  //           Poracle.generateDescription(
  //             y,
  //             category,
  //             webhookData[selectedWebhook].leagues,
  //             t,
  //           )?.replace(/\*/g, '') || '',
  //       }))
  //       .sort(
  //         (a, b) =>
  //           a[staticInfo[category].sortProp] - b[staticInfo[category].sortProp],
  //       ),
  //   [tracked, webhookData[selectedWebhook].human.current_profile_no],
  // )

  return (
    <Box role="tabpanel" hidden={category !== visible}>
      <Box pb={1}>
        <AdvSearch
          search={trackedSearch}
          setSearch={setTrackedSearch}
          category={category}
        />
      </Box>
      {tracked.length ? (
        <Virtuoso
          style={{ height: '55vh' }}
          // @ts-ignore
          data={tracked}
          itemContent={(i) => <TrackedTile key={i} index={i} />}
          // useWindowScroll
        />
      ) : (
        <div className="flex-center" style={{ flex: '1 1 auto' }}>
          <Typography variant="h6" align="center">
            {t('no_alerts')}
          </Typography>
        </div>
      )}
      <Selecting />
    </Box>
  )
}

export default Tracked

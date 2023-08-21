/* eslint-disable react/no-unstable-nested-components */
// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Virtuoso } from 'react-virtuoso'
import Typography from '@mui/material/Typography'

import Box from '@mui/material/Box'
import AdvSearch from '@components/layout/dialogs/filters/AdvSearch'
import { Loading } from '@components/layout/general/Loading'

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

  const { data: tracked, loading } = useGetWebhookData(category)
  const trackedSearch = useWebhookStore((s) => s.trackedSearch)

  return loading ? (
    <Loading>{t('loading', { category: t(category) })}</Loading>
  ) : (
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
          style={{ height: '60cqh' }}
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

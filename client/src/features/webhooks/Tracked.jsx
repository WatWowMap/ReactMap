// @ts-check
/* eslint-disable react/no-unstable-nested-components */
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Virtuoso } from 'react-virtuoso'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

import { Loading } from '@components/Loading'
import { GenericSearch } from '@components/inputs/GenericSearch'
import { useWebhookStore } from '@store/useWebhookStore'

import { TrackedTile } from './tiles/TrackedTile'
import { Selecting } from './Selecting'
import { useGetWebhookData } from './hooks/useGetWebhookData'

/**
 *
 * @param {{ category: Exclude<import('@store/useWebhookStore').WebhookStore['category'], 'human'> }} props
 * @returns
 */
export const Tracked = ({ category }) => {
  const { t } = useTranslation()

  const { data: tracked, loading } = useGetWebhookData(category)

  return loading ? (
    <Loading>{t('loading', { category: t(category) })}</Loading>
  ) : (
    <>
      <Box pb={1}>
        <WebhookSearch />
      </Box>
      {tracked.length ? (
        <Virtuoso
          // @ts-ignore
          data={tracked}
          itemContent={(i) => <TrackedTile key={i} index={i} />}
          // useWindowScroll
        />
      ) : (
        <Box className="flex-center" height="100%">
          <Typography variant="h6">{t('no_alerts')}</Typography>
        </Box>
      )}
      <Selecting />
    </>
  )
}

export const WebhookSearch = React.memo(() => {
  const search = useWebhookStore((s) => s.trackedSearch)
  const category = useWebhookStore((s) => s.category)

  return (
    <GenericSearch
      value={search}
      setValue={(newValue) =>
        useWebhookStore.setState({ trackedSearch: newValue })
      }
      label={`search_${category}${category === 'pokemon' ? '' : 's'}`}
    />
  )
})

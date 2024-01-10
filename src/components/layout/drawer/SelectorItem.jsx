// @ts-check
import * as React from 'react'
import TuneIcon from '@mui/icons-material/Tune'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Collapse from '@mui/material/Collapse'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { useTranslateById } from '@hooks/useTranslateById'
import { useMemory } from '@hooks/useMemory'
import { useLayoutStore } from '@hooks/useLayoutStore'
import { useStorage, useDeepStore } from '@hooks/useStorage'
import { Img } from '../general/Img'
import { ColoredTile } from '../general/ColoredTile'
import { useWebhookStore } from '../dialogs/webhooks/store'

/** @param {string} id */
const getOtherData = (id) => {
  switch (id.charAt(0)) {
    case 'e':
    case 'r':
      return { level: id.slice(1) }
    default:
      return { pokemon_id: id.split('-')[0], form: id.split('-')[1] }
  }
}

/**
 * @typedef {{
 *  id: string,
 *  category: keyof import('@rm/types').Available,
 *  caption?: boolean
 * }} BaseProps
 *
 * @typedef {BaseProps & {
 *  filter: any,
 *  setFilter: (value: any) => void
 *  onClick: () => void
 * }} FullProps
 */

/** @param {BaseProps} props */
export function StandardItem({ id, category, ...props }) {
  const [filter, setFilter] = useDeepStore(`filters.${category}.filter.${id}`)
  return (
    <SelectorItem
      {...props}
      id={id}
      category={category}
      filter={filter}
      setFilter={setFilter}
      onClick={() =>
        useLayoutStore.setState(
          id.startsWith('t')
            ? { slotSelection: id }
            : {
                advancedFilter: {
                  open: true,
                  id,
                  category,
                  selectedIds: [],
                },
              },
        )
      }
    />
  )
}

/** @param {BaseProps} props */
export function WebhookItem({ id, category, ...props }) {
  const filter = useWebhookStore((s) => s.tempFilters[id])
  const setFilter = () => {
    useWebhookStore.setState((prev) => ({
      tempFilters: {
        ...prev.tempFilters,
        [id]: prev.tempFilters[id]
          ? { ...prev.tempFilters[id], enabled: !prev.tempFilters[id]?.enabled }
          : { enabled: true, ...getOtherData(id) },
      },
    }))
  }
  return (
    <SelectorItem
      {...props}
      id={id}
      category={category}
      filter={filter}
      setFilter={setFilter}
      onClick={() =>
        useWebhookStore.setState({
          advanced: {
            id,
            open: true,
            category,
            selectedIds: [],
          },
        })
      }
    />
  )
}

/** @param {FullProps} props */
export function SelectorItem({
  id,
  category,
  caption,
  filter,
  setFilter,
  onClick,
}) {
  const { t } = useTranslateById({ alt: true, newLine: true })
  const title = t(id)
  const url = useMemory((s) => s.Icons.getIconById(id))
  const easyMode = useStorage((s) => !!s.filters[category]?.easyMode)

  const hasAll =
    category === 'pokemon' || category === 'pokestops' || id.startsWith('t')
  const color = filter?.enabled
    ? filter?.all || easyMode || !hasAll
      ? 'success.main'
      : 'info.main'
    : 'error.dark'
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      position="relative"
      sx={{
        aspectRatio: '1/1',
        outline: 'ButtonText 1px solid',
      }}
      onClick={() => {
        const newFilter = { ...filter }
        if (filter.all) {
          if (hasAll) newFilter.all = false
          newFilter.enabled = !easyMode
        } else if (filter.enabled) {
          newFilter.enabled = false
        } else {
          if (hasAll) newFilter.all = true
          newFilter.enabled = true
        }
        setFilter(newFilter)
      }}
    >
      <ColoredTile bgcolor={color} />
      <Tooltip title={title} arrow>
        <Img
          alt={title}
          src={url}
          sx={caption ? { mb: 2 } : undefined}
          maxHeight="50%"
          maxWidth="50%"
          zIndex={10}
        />
      </Tooltip>
      <Collapse in={!easyMode}>
        <IconButton
          size="small"
          sx={{ position: 'absolute', right: 0, top: 0 }}
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          <TuneIcon fontSize="small" />
        </IconButton>
      </Collapse>
      {caption && (
        <Typography
          variant={title.includes('\n') ? 'caption' : 'subtitle2'}
          lineHeight={1.2}
          align="center"
          position="absolute"
          bottom={2}
          whiteSpace="pre-line"
          height={33}
          display="flex"
          alignItems="center"
        >
          {title}
          {process.env.NODE_ENV === 'development' ? `\n(${id})` : ''}
        </Typography>
      )}
    </Box>
  )
}

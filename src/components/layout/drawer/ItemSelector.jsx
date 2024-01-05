// @ts-check
/* eslint-disable react/no-unstable-nested-components */
import * as React from 'react'
import {
  List,
  ListItem,
  ListItemText,
  Box,
  IconButton,
  ButtonGroup,
  Collapse,
  Tooltip,
} from '@mui/material'
import { VirtuosoGrid } from 'react-virtuoso'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import TuneIcon from '@mui/icons-material/Tune'
import CheckIcon from '@mui/icons-material/Check'
import ClearIcon from '@mui/icons-material/Clear'
import { useTranslateById } from '@hooks/useTranslateById'

import { useDeepStore, useStatic, useStore } from '@hooks/useStore'
import AdvancedFilter from '../dialogs/filters/Advanced'
import { BoolToggle } from './BoolToggle'
import { ItemSearchMemo } from './ItemSearch'

/**
 *
 * @param {{ category: keyof import('@rm/types').Available }} props
 * @returns
 */
function AvailableSelector({ category }) {
  const { t } = useTranslateById()
  const available = useStatic((s) => s.available[category])
  const allFilters = useStatic((s) => s.filters[category]?.filter)

  const onlyShowAvailable = useStore(
    (s) => !!s.filters[category]?.onlyShowAvailable,
  )
  const easyMode = useStore((s) => !!s.filters[category]?.easyMode)
  const search = useStore((s) => s.searches[`${category}QuickSelect`] || '')

  const [open, setOpen] = React.useState(false)

  const items = React.useMemo(() => {
    const lowerCase = search.toLowerCase()
    return (
      onlyShowAvailable
        ? available
        : Object.keys(allFilters).filter((key) => key !== 'global')
    ).filter((key) => t(key).toLowerCase().includes(lowerCase))
  }, [onlyShowAvailable ? available : allFilters, search])

  /** @param {'enable' | 'disable' | 'advanced'} action */
  const setAll = (action) => {
    const keys = new Set(items.map((item) => item))
    useStore.setState((prev) => ({
      filters: {
        ...prev.filters,
        [category]: {
          ...prev.filters[category],
          filter: Object.fromEntries(
            Object.entries(prev.filters[category].filter).map(
              ([key, value]) => {
                const enabled = action !== 'disable'
                const all = action === 'enable'
                return [key, keys.has(key) ? { ...value, enabled, all } : value]
              },
            ),
          ),
        },
      },
    }))
  }

  return (
    <List>
      <ItemSearchMemo field={`searches.${category}QuickSelect`} />
      <BoolToggle
        // TODO: this will be fixed when I add more quick selects for the other categories
        // @ts-ignore
        field={`filters.${category}.onlyShowAvailable`}
        label="only_show_available"
      />
      <ListItem>
        <ListItemText>{t(search ? 'set_filtered' : 'set_all')}</ListItemText>
        <ButtonGroup variant="text" size="small" color="warning">
          <IconButton color="success" onClick={() => setAll('enable')}>
            <CheckIcon />
          </IconButton>
          <Collapse in={!easyMode} orientation="horizontal">
            <IconButton color="info" onClick={() => setOpen(true)}>
              <TuneIcon />
            </IconButton>
          </Collapse>
          <IconButton color="error" onClick={() => setAll('disable')}>
            <ClearIcon />
          </IconButton>
        </ButtonGroup>
      </ListItem>
      <VirtuosoGrid
        style={{ height: 400, width: 292 }}
        totalCount={items.length}
        overscan={5}
        data={items}
        components={{
          Item: (props) => <Grid2 xs={4} {...props} />,
          List: React.forwardRef((props, ref) => (
            <Grid2 {...props} container ref={ref} />
          )),
        }}
        itemContent={(_, key) => (
          <ItemContent category={category}>{key}</ItemContent>
        )}
      />
      {!easyMode && (
        <AdvancedFilter
          id="global"
          category={category}
          open={open}
          setOpen={setOpen}
          selectedIds={items}
        />
      )}
    </List>
  )
}

export const MemoAvailableSelector = React.memo(AvailableSelector, () => true)

/**
 * @param {{ category: keyof import('@rm/types').Available, children: string }} props
 */
function ItemContent({ category, children }) {
  const { t } = useTranslateById()
  const title = t(children)
  const [filter, setFilter] = useDeepStore(
    `filters.${category}.filter.${children}`,
  )
  const url = useStatic((s) => s.Icons.getIconById(children))
  const easyMode = useStore((s) => !!s.filters[category].easyMode)
  const [open, setOpen] = React.useState(false)

  const color = filter?.enabled
    ? filter?.all || easyMode
      ? 'success.main'
      : 'info.main'
    : 'error.dark'

  return (
    <>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        position="relative"
        sx={{ aspectRatio: '1/1', outline: 'ButtonText 1px solid' }}
        onClick={() => {
          const newFilter = { ...filter }
          if (filter.all) {
            newFilter.all = false
            newFilter.enabled = !easyMode
          } else if (filter.enabled) {
            newFilter.enabled = false
          } else {
            newFilter.all = true
            newFilter.enabled = true
          }
          setFilter(newFilter)
        }}
      >
        <Box
          height="100%"
          width="100%"
          bgcolor={color}
          position="absolute"
          top={0}
          left={0}
          sx={{ opacity: 0.4 }}
        />
        <Tooltip title={title} arrow>
          <img
            alt={title}
            src={url}
            style={{
              maxHeight: 50,
              maxWidth: 50,
              zIndex: 10,
            }}
          />
        </Tooltip>
        <Collapse in={!easyMode}>
          <IconButton
            size="small"
            sx={{ position: 'absolute', right: 0, top: 0 }}
            onClick={(e) => {
              e.stopPropagation()
              setOpen(true)
            }}
          >
            <TuneIcon fontSize="small" />
          </IconButton>
        </Collapse>
      </Box>
      {!easyMode && (
        <AdvancedFilter
          id={children}
          category={category}
          open={open}
          setOpen={setOpen}
        />
      )}
    </>
  )
}

// @ts-check
import * as React from 'react'
import TuneIcon from '@mui/icons-material/Tune'
import CheckIcon from '@mui/icons-material/Check'
import ClearIcon from '@mui/icons-material/Clear'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ButtonGroup from '@mui/material/ButtonGroup'
import IconButton from '@mui/material/IconButton'
import Collapse from '@mui/material/Collapse'
import Box from '@mui/material/Box'
import { useTranslation } from 'react-i18next'

import { useTranslateById } from '@hooks/useTranslateById'
import { useLayoutStore, useStatic, useStore } from '@hooks/useStore'

import { BoolToggle } from './BoolToggle'
import { GenericSearchMemo } from './ItemSearch'
import { StandardItem } from './SelectorItem'
import { VirtualGrid } from '../general/VirtualGrid'

/**
 * @param {{
 *  category: keyof import('@rm/types').Available,
 *  itemsPerRow?: number,
 *  children?: React.ReactNode,
 * }} props
 * @returns
 */
function SelectorList({ category }) {
  const { t: tId } = useTranslateById()
  const { t } = useTranslation()
  const available = useStatic((s) => s.available[category])
  const allFilters = useStatic((s) => s.filters[category]?.filter)

  const onlyShowAvailable = useStore(
    (s) => !!s.filters[category]?.onlyShowAvailable,
  )
  const easyMode = useStore((s) => !!s.filters[category]?.easyMode)
  const search = useStore((s) => s.searches[`${category}QuickSelect`] || '')

  const translated = React.useMemo(
    () =>
      (onlyShowAvailable ? available : Object.keys(allFilters))
        .filter((key) => key !== 'global')
        .map((id) => ({ id, name: tId(id).toLowerCase() })),
    [onlyShowAvailable ? available : allFilters, tId],
  )
  const items = React.useMemo(() => {
    const lowerCase = search.toLowerCase()
    return translated
      .filter((item) => item.name.includes(lowerCase))
      .map((item) => item.id)
  }, [translated, search])

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
      <ListItem>
        <GenericSearchMemo field={`searches.${category}QuickSelect`} />
      </ListItem>
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
            <IconButton
              color="info"
              onClick={() =>
                useLayoutStore.setState({
                  advancedFilter: {
                    open: true,
                    id: 'global',
                    category,
                    selectedIds: items,
                  },
                })
              }
            >
              <TuneIcon />
            </IconButton>
          </Collapse>
          <IconButton color="error" onClick={() => setAll('disable')}>
            <ClearIcon />
          </IconButton>
        </ButtonGroup>
      </ListItem>
      <Box height={400}>
        <VirtualGrid data={items} xs={4}>
          {(_, key) => <StandardItem id={key} category={category} />}
        </VirtualGrid>
      </Box>
    </List>
  )
}

export const MemoSelectorList = React.memo(
  SelectorList,
  (prev, next) => prev.category === next.category,
)

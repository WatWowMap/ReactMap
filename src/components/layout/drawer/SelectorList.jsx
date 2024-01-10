/* eslint-disable no-fallthrough */
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
import { useMemory } from '@hooks/useMemory'
import { useLayoutStore } from '@hooks/useLayoutStore'
import { useStorage } from '@hooks/useStorage'

import { BoolToggle } from './BoolToggle'
import { GenericSearchMemo } from './ItemSearch'
import { StandardItem } from './SelectorItem'
import { VirtualGrid } from '../general/VirtualGrid'

/**
 * @template {keyof import('@rm/types').Available} T
 * @param {{
 *  category: T,
 *  subCategory?: T extends 'gyms' ? 'raids' | 'pokemon' : T extends 'pokestops' ? 'lures' | 'invasions' | 'quests' | 'eventStops' | 'rocketPokemon' | 'pokemon' : never
 *  itemsPerRow?: number,
 *  children?: React.ReactNode,
 * }} props
 * @returns
 */
function SelectorList({ category, subCategory }) {
  const { t: tId } = useTranslateById()
  const { t } = useTranslation()
  const available = useMemory((s) => s.available[category])
  const allFilters = useMemory((s) => s.filters[category]?.filter)

  const onlyShowAvailable = useStorage(
    (s) => !!s.filters[category]?.onlyShowAvailable,
  )
  const easyMode = useStorage((s) => !!s.filters[category]?.easyMode)
  const search = useStorage((s) => s.searches[`${category}QuickSelect`] || '')

  const translated = React.useMemo(
    () =>
      (onlyShowAvailable ? available : Object.keys(allFilters))
        .filter((key) => {
          if (key === 'global') return false
          switch (subCategory) {
            case 'raids':
              return key.startsWith('r') || key.startsWith('e')
            case 'lures':
              return key.startsWith('l')
            case 'invasions':
              return key.startsWith('i')
            case 'quests':
              return (
                key.startsWith('q') ||
                key.startsWith('m') ||
                key.startsWith('x') ||
                key.startsWith('c') ||
                key.startsWith('d')
              )
            case 'eventStops':
              return key.startsWith('b')
            case 'rocketPokemon':
              return key.startsWith('a')
            default:
              switch (category) {
                case 'gyms':
                  return key.startsWith('t')
                default:
                  return !Number.isNaN(Number(key.charAt(0)))
              }
          }
        })
        .map((id) => ({ id, name: tId(id).toLowerCase() })),
    [onlyShowAvailable ? available : allFilters, tId, category, subCategory],
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
    useStorage.setState((prev) => ({
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
  (prev, next) =>
    prev.category === next.category && prev.subCategory === next.subCategory,
)

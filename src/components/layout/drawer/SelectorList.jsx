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
import AppBar from '@mui/material/AppBar'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { capitalize } from '@mui/material/utils'
import { useTranslation } from 'react-i18next'

import { useTranslateById } from '@hooks/useTranslateById'
import { useMemory } from '@hooks/useMemory'
import { useLayoutStore } from '@hooks/useLayoutStore'
import { useStorage } from '@hooks/useStorage'

import { BoolToggle } from './BoolToggle'
import { GenericSearchMemo } from './ItemSearch'
import { StandardItem } from './SelectorItem'
import { VirtualGrid } from '../general/VirtualGrid'
import TabPanel from '../general/TabPanel'

/**
 * @template {keyof import('@rm/types').Available} T
 * @typedef {{
 *  category: T,
 *  subCategory?: T extends 'gyms' ? 'raids' | 'pokemon' : T extends 'pokestops' ? 'lures' | 'invasions' | 'quests' | 'eventStops' | 'rocketPokemon' | 'pokemon' : never
 *  itemsPerRow?: number,
 *  children?: React.ReactNode,
 *  label?: string
 *  height?: React.CSSProperties['height'],
 * }} SelectorListProps
 * @param {SelectorListProps<keyof import('@rm/types').Available>} props
 * @returns
 */
function SelectorList({ category, subCategory, label, height = 400 }) {
  const searchKey = `${category}${
    subCategory ? capitalize(subCategory) : ''
  }QuickSelect`

  const { t: tId } = useTranslateById()
  const { t } = useTranslation()
  const available = useMemory((s) => s.available[category])
  const allFilters = useMemory((s) => s.filters[category]?.filter)

  const onlyShowAvailable = useStorage((s) =>
    category === 'pokemon' ? !!s.filters[category]?.onlyShowAvailable : true,
  )
  const easyMode = useStorage((s) => !!s.filters[category]?.easyMode)
  const search = useStorage((s) => s.searches[searchKey] || '')

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
            case 'pokemon':
              return !Number.isNaN(Number(key.charAt(0)))
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
    <List dense sx={{ width: '100%' }}>
      <ListItem disableGutters={category !== 'pokemon'}>
        <GenericSearchMemo field={`searches.${searchKey}`} label={label} />
      </ListItem>
      {category === 'pokemon' && (
        <BoolToggle
          // @ts-ignore // WHY TS??
          field={`filters.${category}.onlyShowAvailable`}
          label="only_show_available"
        />
      )}
      <ListItem disableGutters={category !== 'pokemon'}>
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
          <IconButton
            color="error"
            onClick={() => setAll('disable')}
            sx={{ pr: 0 }}
          >
            <ClearIcon />
          </IconButton>
        </ButtonGroup>
      </ListItem>
      <Box height={height}>
        <VirtualGrid data={items} xs={4}>
          {(_, key) => <StandardItem id={key} category={category} />}
        </VirtualGrid>
      </Box>
    </List>
  )
}

export const SelectorListMemo = React.memo(
  SelectorList,
  (prev, next) =>
    prev.category === next.category &&
    prev.subCategory === next.subCategory &&
    prev.label === next.label &&
    prev.height === next.height,
)

/** @param {{ children: React.ReactElement[] }} props */
export function MultiSelectorList({ children }) {
  const { t } = useTranslation()
  const [openTab, setOpenTab] = React.useState(0)

  const handleTabChange = (_e, newValue) => setOpenTab(newValue)

  return (
    <Box pt={2}>
      <AppBar position="static">
        <Tabs value={openTab} onChange={handleTabChange}>
          {children.map((child) => (
            <Tab key={child.key} label={t(child.key)} />
          ))}
        </Tabs>
      </AppBar>
      {children.map((child, index) => (
        <TabPanel value={openTab} index={index} key={child.key}>
          {child}
        </TabPanel>
      ))}
    </Box>
  )
}

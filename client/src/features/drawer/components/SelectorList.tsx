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
import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { useDeepStore, useStorage } from '@store/useStorage'
import { useGetAvailable } from '@hooks/useGetAvailable'
import { VirtualGrid } from '@components/virtual/VirtualGrid'
import { TabPanel } from '@components/TabPanel'
import { BoolToggle } from '@components/inputs/BoolToggle'
import { GenericSearchMemo } from '@components/inputs/GenericSearch'
import { StandardItem } from '@components/virtual/StandardItem'

type SelectorListProps<T extends keyof import('@rm/types').Available> = {
  category: T
  subCategory?: T extends 'gyms'
    ? 'raids' | 'pokemon'
    : T extends 'pokestops'
      ?
          | 'lures'
          | 'invasions'
          | 'quests'
          | 'showcase'
          | 'rocketPokemon'
          | 'pokemon'
      : never
  itemsPerRow?: number
  children?: React.ReactNode
  label?: string
  height?: React.CSSProperties['height']
}

function SelectorList({
  category,
  subCategory,
  label,
  height = 400,
}: SelectorListProps<keyof import('@rm/types').Available>) {
  const searchKey = `${category}${
    subCategory ? capitalize(subCategory) : ''
  }QuickSelect`
  const { available } = useGetAvailable(category)
  const { t: tId } = useTranslateById()
  const { t } = useTranslation()
  const allFilters = useMemory((s) => s.filters[category]?.filter)

  const onlyShowAvailable = useStorage((s) =>
    category === 'pokemon' || category === 'nests'
      ? !!s.filters[category]?.onlyShowAvailable
      : true,
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
              return key.startsWith('e')
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
                key.startsWith('d') ||
                key.startsWith('p')
              )
            case 'showcase':
              return (
                key.startsWith('f') ||
                key.startsWith('h') ||
                key.startsWith('b')
              )
            case 'rocketPokemon':
              return key.startsWith('a')
            case 'pokemon':
              return Number.isInteger(Number(key.charAt(0)))
            default:
              switch (category) {
                case 'gyms':
                  return key.startsWith('t')
                default:
                  return Number.isInteger(Number(key.charAt(0)))
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

  const setAll = (action: 'enable' | 'disable' | 'advanced') => {
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
      {translated.length > 10 && (
        <ListItem disableGutters={category !== 'pokemon'}>
          <GenericSearchMemo field={`searches.${searchKey}`} label={label} />
        </ListItem>
      )}
      {(category === 'pokemon' || category === 'nests') && (
        <BoolToggle
          disableGutters={category === 'nests'}
          field={`filters.${category}.onlyShowAvailable`}
          label="only_show_available"
        />
      )}
      {!!items.length && (
        <ListItem disableGutters={category !== 'pokemon'}>
          <ListItemText>{t(search ? 'set_filtered' : 'set_all')}</ListItemText>
          <ButtonGroup color="warning" size="small" variant="text">
            <IconButton color="success" onClick={() => setAll('enable')}>
              <CheckIcon />
            </IconButton>
            <Collapse
              in={!easyMode && category === 'pokemon'}
              orientation="horizontal"
            >
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
              sx={{ pr: 0 }}
              onClick={() => setAll('disable')}
            >
              <ClearIcon />
            </IconButton>
          </ButtonGroup>
        </ListItem>
      )}
      <Box
        height={
          typeof height === 'number'
            ? Math.min(height, Math.ceil(items.length / 3) * 90)
            : height
        }
      >
        <VirtualGrid data={items} xs={4}>
          {(_, key) => <StandardItem category={category} id={key} />}
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

export function MultiSelectorList({
  children,
  tabKey,
}: {
  children: React.ReactElement[]
  tabKey: string
}) {
  const { t } = useTranslation()
  const [openTab, setOpenTab] = useDeepStore(`tabs.${tabKey}`, 0)

  const handleTabChange: import('@mui/material').TabsProps['onChange'] =
    React.useCallback((_e, newValue) => setOpenTab(newValue), [])

  return (
    <Box pt={2}>
      <AppBar position="static">
        <Tabs value={openTab} onChange={handleTabChange}>
          {children.map((child) => (
            <Tab key={child.key} label={t(child.key)} />
          ))}
        </Tabs>
      </AppBar>
      {children.filter(Boolean).map((child, index) => (
        <TabPanel key={child.key} index={index} value={openTab}>
          {child}
        </TabPanel>
      ))}
    </Box>
  )
}

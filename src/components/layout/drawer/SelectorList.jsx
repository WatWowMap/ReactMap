/* eslint-disable react/no-unstable-nested-components */
// @ts-check
import * as React from 'react'
import { VirtuosoGrid } from 'react-virtuoso'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import TuneIcon from '@mui/icons-material/Tune'
import CheckIcon from '@mui/icons-material/Check'
import ClearIcon from '@mui/icons-material/Clear'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ButtonGroup from '@mui/material/ButtonGroup'
import IconButton from '@mui/material/IconButton'
import Collapse from '@mui/material/Collapse'

import { useTranslateById } from '@hooks/useTranslateById'
import { useStatic, useStore } from '@hooks/useStore'

import AdvancedFilter from '../dialogs/filters/Advanced'
import { BoolToggle } from './BoolToggle'
import { ItemSearchMemo } from './ItemSearch'
import { SelectorItem } from './SelectorItem'

/**
 *
 * @param {{ category: keyof import('@rm/types').Available }} props
 * @returns
 */
function SelectorList({ category }) {
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
        style={{ height: 400 }}
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
          <SelectorItem category={category}>{key}</SelectorItem>
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

export const MemoSelectorList = React.memo(
  SelectorList,
  (prev, next) => prev.category === next.category,
)

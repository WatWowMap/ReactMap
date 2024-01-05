// @ts-check
import * as React from 'react'
import TuneIcon from '@mui/icons-material/Tune'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Collapse from '@mui/material/Collapse'
import Box from '@mui/material/Box'

import { useTranslateById } from '@hooks/useTranslateById'
import { useDeepStore, useStatic, useStore } from '@hooks/useStore'

import AdvancedFilter from '../dialogs/filters/Advanced'

/**
 * @param {{ category: keyof import('@rm/types').Available, children: string }} props
 */
export function SelectorItem({ category, children }) {
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
        sx={{
          aspectRatio: '1/1',
          outline: 'ButtonText 1px solid',
        }}
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
          sx={(theme) => ({
            opacity: 0.5,
            transition: theme.transitions.create('opacity', {
              duration: theme.transitions.duration.shortest,
            }),
            '&:hover': {
              opacity: 0.75,
            },
          })}
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
        <div>
          <Collapse in={!easyMode} component="div">
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
        </div>
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

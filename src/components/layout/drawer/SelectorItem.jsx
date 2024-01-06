// @ts-check
import * as React from 'react'
import TuneIcon from '@mui/icons-material/Tune'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Collapse from '@mui/material/Collapse'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { useTranslateById } from '@hooks/useTranslateById'
import {
  useDeepStore,
  useLayoutStore,
  useStatic,
  useStore,
} from '@hooks/useStore'
import { Img } from '../custom/CustomImg'
import { ColoredTile } from '../general/ColoredTile'

/**
 * @param {{
 *  id: string,
 *  category: keyof import('@rm/types').Available,
 *  children?: React.ReactNode
 *  caption?: boolean
 * }} props
 */
export function SelectorItem({ id, category, caption }) {
  const { t } = useTranslateById({ alt: true, newLine: true })
  const [filter, setFilter] = useDeepStore(`filters.${category}.filter.${id}`)
  const title = t(id)
  const url = useStatic((s) => s.Icons.getIconById(id))
  const easyMode = useStore((s) => !!s.filters[category].easyMode)
  const color = filter?.enabled
    ? filter?.all || easyMode
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
            useLayoutStore.setState({
              advancedFilter: {
                open: true,
                id,
                category,
                selectedIds: [],
              },
            })
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
        </Typography>
      )}
    </Box>
  )
}

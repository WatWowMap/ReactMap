// @ts-check
import * as React from 'react'
import TuneIcon from '@mui/icons-material/Tune'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'

import { useTranslateById } from '@hooks/useTranslateById'
import { useMemory } from '@hooks/useMemory'
import { ColoredTile } from '@components/virtual/ColoredTile'
import { ToggleTypography } from '@components/ToggleTypography'
import { SQUARE_ITEM } from '@components/virtual/VirtualGrid'

/**
 * @template {string} T
 * @typedef {{
 *  id: string,
 *  category: T,
 *  caption?: boolean
 * }} BaseProps
 */

/**
 * @typedef {{
 *  id: string,
 *  filter: any, // TODO: fix this
 *  setFilter: (value: any) => void
 *  onClick: () => void
 *  hasAll?: boolean
 *  easyMode?: boolean
 *  caption?: boolean
 * }} FullProps
 */

/** @param {FullProps} props */
export function SelectorItem({
  id,
  filter,
  setFilter,
  onClick,
  hasAll,
  easyMode,
}) {
  const { t } = useTranslateById({ alt: true, newLine: true })
  const title = t(id)
  const url = useMemory((s) => s.Icons.getIconById(id))

  const color = filter?.enabled
    ? filter?.all || !hasAll || easyMode
      ? 'success.main'
      : 'info.main'
    : 'error.dark'

  const handleClick = React.useCallback(() => {
    const newFilter = { ...filter }
    // red => green => blue => red
    if (filter.all && hasAll) {
      newFilter.all = false
      newFilter.enabled = !easyMode
    } else if (filter.enabled) {
      newFilter.enabled = false
    } else {
      if (hasAll) newFilter.all = true
      newFilter.enabled = true
    }
    setFilter(newFilter)
  }, [filter, setFilter, hasAll, easyMode])

  /** @type {import('@mui/material').IconButtonProps['onClick']} */
  const handleIconClick = React.useCallback(
    (e) => {
      e.stopPropagation()
      onClick()
    },
    [onClick],
  )

  return (
    <Box
      className="vgrid-item"
      position="relative"
      minWidth="100%"
      minHeight="100%"
      sx={SQUARE_ITEM}
      onClick={handleClick}
    >
      <ColoredTile bgcolor={color} />
      <Tooltip
        title={process.env.NODE_ENV === 'development' ? id : title}
        arrow
        className="vgrid-image"
      >
        <Box
          component="img"
          alt={title}
          src={url}
          maxHeight="50%"
          maxWidth="50%"
          zIndex={10}
          sx={{ aspectRatio: '1/1', objectFit: 'contain' }}
        />
      </Tooltip>
      <IconButton className="vgrid-icon" size="small" onClick={handleIconClick}>
        <TuneIcon fontSize="small" />
      </IconButton>
      <ToggleTypography
        className="vgrid-caption"
        variant="caption"
        fontWeight="bold"
        zIndex={10}
        alignSelf="end"
        px={1}
      >
        {title && title.split('\n').at(-1).replace(/[()]/g, '')}
      </ToggleTypography>
    </Box>
  )
}

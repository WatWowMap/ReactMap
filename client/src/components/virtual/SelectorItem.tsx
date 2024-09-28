// @ts-check
import * as React from 'react'
import TuneIcon from '@mui/icons-material/Tune'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import { useTranslateById } from '@hooks/useTranslateById'
import { useMemory } from '@store/useMemory'
import { ColoredTile } from '@components/virtual/ColoredTile'
import { ToggleTypography } from '@components/ToggleTypography'
import { SQUARE_ITEM } from '@components/virtual/VirtualGrid'
import { StatusIcon } from '@components/StatusIcon'
import { useTranslation } from 'react-i18next'

export type BaseProps<T extends string> = {
  id: string
  category: T
  caption?: boolean
}

type FullProps = {
  id: string
  filter: any // TODO: fix this
  setFilter: (value: any) => void
  onClick: () => void
  hasAll?: boolean
  easyMode?: boolean
  caption?: boolean
}

export function SelectorItem({
  id,
  filter,
  setFilter,
  onClick,
  hasAll,
  easyMode,
}: FullProps) {
  const { t } = useTranslateById({ alt: true, newLine: true })
  const title = t(id)
  const url = useMemory((s) => s.Icons.getIconById(id))

  const color = filter?.enabled
    ? filter?.all || !hasAll || easyMode
      ? 'success.main'
      : 'info.main'
    : 'error.dark'

  const handleClick = React.useCallback(() => {
    const newFilter = { all: false, enabled: false, ...filter }

    // red => green => blue => red
    if (newFilter.all && hasAll) {
      newFilter.all = false
      newFilter.enabled = !easyMode
    } else if (newFilter.enabled) {
      newFilter.enabled = false
    } else {
      if (hasAll) newFilter.all = true
      newFilter.enabled = true
    }
    setFilter(newFilter)
  }, [filter, setFilter, hasAll, easyMode])

  const handleIconClick: import('@mui/material').IconButtonProps['onClick'] =
    React.useCallback(
      (e) => {
        e.stopPropagation()
        onClick()
      },
      [onClick],
    )

  const status =
    hasAll && !easyMode
      ? filter?.all || filter?.enabled
        ? filter?.all && filter?.enabled
          ? true
          : null
        : false
      : filter?.enabled

  return (
    <Box
      className="vgrid-item"
      minHeight="100%"
      minWidth="100%"
      position="relative"
      sx={SQUARE_ITEM}
      onClick={handleClick}
    >
      <ColoredTile bgcolor={color} />
      <Tooltip
        arrow
        className="vgrid-image"
        title={process.env.NODE_ENV === 'development' ? id : title}
      >
        <Box
          alt={title}
          component="img"
          maxHeight="50%"
          maxWidth="50%"
          src={url}
          sx={{ aspectRatio: '1/1', objectFit: 'contain' }}
          zIndex={10}
        />
      </Tooltip>
      <IconButton className="vgrid-icon" size="small" onClick={handleIconClick}>
        <TuneIcon fontSize="small" />
      </IconButton>
      <Status status={status} />
      <ToggleTypography
        alignSelf="end"
        className="vgrid-caption"
        fontWeight="bold"
        px={1}
        variant="caption"
        zIndex={10}
      >
        {title && title.split('\n').at(-1).replace(/[()]/g, '')}
      </ToggleTypography>
    </Box>
  )
}

function Status({ status }: { status: null | boolean }) {
  const { t } = useTranslation()

  return (
    <Tooltip
      title={
        status === null
          ? t('individual_filters')
          : status
            ? t('enabled')
            : t('disabled')
      }
    >
      <StatusIcon
        className="vgrid-color-blind-icon"
        color="action"
        fontSize="small"
        status={status}
      />
    </Tooltip>
  )
}

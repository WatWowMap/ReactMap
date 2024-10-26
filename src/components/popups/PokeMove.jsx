// @ts-check
import * as React from 'react'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { useMemory } from '@store/useMemory'
import { useTranslation } from 'react-i18next'
import { PokeType } from './PokeType'

/**
 * @param {{ id: number, size?: 'small' | 'medium' | 'large' }} props
 */
export function PokeMove({ id, size = 'small' }) {
  const move = useMemory((s) => s.masterfile.moves[id])
  const { t } = useTranslation()

  if (!move) return null
  return (
    <Stack
      direction="row"
      width="100%"
      justifyContent="space-between"
      alignItems="center"
    >
      <PokeType id={move.type} size={size} />
      <Typography
        variant="caption"
        align="center"
        width="100%"
        pl={1}
        lineHeight={1.25}
      >
        {t(`move_${id}`)}
      </Typography>
    </Stack>
  )
}

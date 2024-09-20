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
      justifyContent="space-evenly"
      alignItems="center"
    >
      <PokeType id={move.type} size={size} />
      &nbsp;
      <Typography variant="caption" align="center">
        {t(`move_${id}`)}
      </Typography>
    </Stack>
  )
}

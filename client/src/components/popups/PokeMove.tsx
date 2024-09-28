import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useMemory } from '@store/useMemory'
import { useTranslation } from 'react-i18next'

import { PokeType } from './PokeType'

export function PokeMove({
  id,
  size = 'small',
}: {
  id: number
  size?: 'small' | 'medium' | 'large'
}) {
  const move = useMemory((s) => s.masterfile.moves[id])
  const { t } = useTranslation()

  if (!move) return null

  return (
    <Stack
      alignItems="center"
      direction="row"
      justifyContent="space-between"
      width="100%"
    >
      <PokeType id={move.type} size={size} />
      <Typography
        align="center"
        lineHeight={1.25}
        pl={1}
        variant="caption"
        width="100%"
      >
        {t(`move_${id}`)}
      </Typography>
    </Stack>
  )
}

// @ts-check
import * as React from 'react'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { FCSelectListItem } from '@components/inputs/FCSelect'

export function PokemonModeSelector() {
  const filterMode = useStorage((s) => s.getPokemonFilterMode())
  const { t } = useTranslation()
  const ui = useMemory((s) => s.ui.pokemon)
  const selectRef = React.useRef(/** @type {HTMLDivElement | null} */ (null))

  return (
    <FCSelectListItem
      label={t('pokemon_filter_mode')}
      ref={selectRef}
      value={filterMode}
      fullWidth
      size="small"
      renderValue={(selected) => t(selected)}
      onChange={(e) => {
        const { setPokemonFilterMode } = useStorage.getState()
        switch (e.target.value) {
          case 'basic':
            return setPokemonFilterMode(false, true)
          case 'intermediate':
            return setPokemonFilterMode(false, false)
          case 'expert':
            return setPokemonFilterMode(true, false)
          default:
        }
      }}
    >
      {['basic', 'intermediate', ...(ui.legacy ? ['expert'] : [])].map(
        (tier) => (
          <MenuItem
            key={tier}
            dense
            value={tier}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              whiteSpace: 'normal',
              width: selectRef.current?.clientWidth || 'auto',
            }}
          >
            <Typography variant="subtitle2">{t(tier)}</Typography>
            <Typography variant="caption" flexWrap="wrap">
              {t(`${tier}_description`)}
            </Typography>
          </MenuItem>
        ),
      )}
    </FCSelectListItem>
  )
}

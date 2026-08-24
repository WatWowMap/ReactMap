// @ts-check

import { BoolToggle } from '@components/inputs/BoolToggle'
import CakeIcon from '@mui/icons-material/Cake'
import ListItemIcon from '@mui/material/ListItemIcon'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useTranslation } from 'react-i18next'

import { SettingIcon } from './Icon'

export function HolidaySetting() {
  const { t } = useTranslation()
  const holidayEffects = useMemory((s) => s.config.holidayEffects)
  const enhancedGraphics = useStorage((s) => s.enhancedGraphics)

  return (holidayEffects || []).map(({ name, images }) => (
    <BoolToggle
      key={name}
      field={`holidayEffects.${name}`}
      label={t('disable', { name })}
      disabled={!enhancedGraphics}
    >
      <ListItemIcon>
        {images?.length > 0 ? (
          <SettingIcon src={images[0]} alt={name} />
        ) : (
          <CakeIcon />
        )}
      </ListItemIcon>
    </BoolToggle>
  ))
}

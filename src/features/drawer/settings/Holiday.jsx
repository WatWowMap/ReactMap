// @ts-check
import * as React from 'react'
import ListItemIcon from '@mui/material/ListItemIcon'
import CakeIcon from '@mui/icons-material/Cake'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { BoolToggle } from '@components/inputs/BoolToggle'

import { SettingIcon } from './Icon'

export function HolidaySetting() {
  const { t } = useTranslation()
  const holidayEffects = useMemory((s) => s.config.holidayEffects)

  return (holidayEffects || []).map(({ name, images }) => (
    <BoolToggle
      key={name}
      field={`holidayEffects.${name}`}
      label={t('disable', { name })}
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

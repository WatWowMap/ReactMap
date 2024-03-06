// @ts-check
import * as React from 'react'
import ListSubheader from '@mui/material/ListSubheader'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { DividerWithMargin } from '@components/StyledDivider'
import { getProperName } from '@utils/getProperName'
import { FCSelectListItem } from '@components/inputs/FCSelect'
import { SettingIcon } from './Icon'

/**
 *
 * @param {{ asset: 'icons' | 'audio' }} param0
 * @returns
 */
export function UAssetSetting({ asset }) {
  const { t } = useTranslation()
  const customizable = useMemory(
    (s) => s[asset === 'icons' ? 'Icons' : 'Audio'].customizable,
  )

  if (customizable.length === 0) return null
  return (
    <>
      <ListSubheader>{t(asset)}</ListSubheader>
      {customizable.map((category) => (
        <UAssetSelect
          key={`${asset}${category}`}
          asset={asset}
          category={category}
        />
      ))}
      <DividerWithMargin />
    </>
  )
}

/**
 *
 * @param {{ asset: 'icons' | 'audio', category: string }} props
 * @returns
 */
function UAssetSelect({ asset, category }) {
  const { t } = useTranslation()
  const value = useStorage((s) => s[asset][category])
  const iconUrl = useMemory((s) => s.Icons.getMisc(category))
  const options = useMemory((s) => s.Icons[category])

  const instanceName = asset === 'icons' ? 'Icons' : 'Audio'
  const setSelection = useMemory((s) => s[instanceName].setSelection)

  return (
    <FCSelectListItem
      name={category}
      value={value}
      label={t(`${category}_${asset}`, `${category} ${instanceName}`)}
      onChange={({ target }) => {
        setSelection(target.name, target.value)
        useStorage.setState((prev) => ({
          [asset]: { ...prev.userSettings, [target.name]: target.value },
        }))
      }}
      icon={<SettingIcon src={iconUrl} alt={category} />}
    >
      {[...options].map((option) => (
        <MenuItem key={option} value={option}>
          {t(
            `${category.toLowerCase()}_${option.toLowerCase()}`,
            getProperName(option),
          )}
        </MenuItem>
      ))}
    </FCSelectListItem>
  )
}

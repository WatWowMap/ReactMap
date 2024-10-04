import ListSubheader from '@mui/material/ListSubheader'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { DividerWithMargin } from '@components/StyledDivider'
import { getProperName } from '@utils/strings'
import { FCSelectListItem } from '@components/inputs/FCSelect'

import { SettingIcon } from './Icon'

export function UAssetSetting({ asset }: { asset: 'icons' | 'audio' }) {
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

function UAssetSelect({
  asset,
  category,
}: {
  asset: 'icons' | 'audio'
  category: string
}) {
  const { t } = useTranslation()
  const value = useStorage((s) => s[asset][category])
  const iconUrl = useMemory((s) => s.Icons.getMisc(category))
  const instanceName = asset === 'icons' ? 'Icons' : 'Audio'
  const options = useMemory((s) => s[instanceName][category])

  return (
    <FCSelectListItem
      icon={<SettingIcon alt={category} src={iconUrl} />}
      label={t(`${category}_${asset}`, `${category} ${instanceName}`)}
      name={category}
      value={options?.has(value) ? value : ''}
      onChange={({ target }) => {
        useMemory.setState((prev) => {
          prev[instanceName].setSelection(target.name, target.value)

          return { [instanceName]: prev[instanceName] }
        })
        useStorage.setState((prev) => ({
          [asset]: { ...prev[asset], [target.name]: target.value },
        }))
      }}
    >
      {[...(options || [])].map((option) => (
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

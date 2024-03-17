import * as React from 'react'
import DialogContent from '@mui/material/DialogContent'
import Input from '@mui/material/Input'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Switch from '@mui/material/Switch'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { toggleDialog, useLayoutStore } from '@store/useLayoutStore'
import { setDeepStore, useDeepStore, useStorage } from '@store/useStorage'
import { getPermission } from '@services/desktopNotification'
import { analytics } from '@utils/analytics'
import { getProperName, camelToSnake } from '@utils/strings'

import { Header } from './Header'
import { Footer } from './Footer'
import { DialogWrapper } from './DialogWrapper'

/**
 * @template {keyof import('@store/useStorage').UseStorage['userSettings']} T
 * @param {{
 *  category: T
 *  option: keyof import('@store/useStorage').UseStorage['userSettings'][T]
 *  subOption?: string
 *  localState: Record<string, any>
 *  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void
 * }} props
 */
function InputType({ option, subOption, category }) {
  const staticSetting = useMemory((s) =>
    subOption
      ? s.clientMenus[category]?.[option]?.sub?.[subOption]
      : s.clientMenus[category]?.[option],
  )
  const [userValue, setUserValue] = useDeepStore(
    `userSettings.${category}.${subOption || option}`,
    staticSetting?.type === 'bool',
  )
  const handleChange = ({ target }) => {
    if (target.type === 'checkbox') {
      setUserValue(target.checked)
    } else {
      setUserValue(
        staticSetting?.type === 'number'
          ? +target.value || 0
          : target.value || '',
      )
    }
    analytics(
      'User Options',
      `Name: ${option} New Value: ${target.checked ?? target.value}`,
      category,
    )
  }

  switch (staticSetting.type) {
    case 'bool':
      return (
        <Switch
          color="secondary"
          checked={!!userValue}
          onChange={handleChange}
          disabled={staticSetting?.disabled}
        />
      )
    default:
      return (
        <Input
          color="secondary"
          style={{ width: 50 }}
          value={userValue ?? ''}
          onChange={handleChange}
          size="small"
          type={staticSetting.type}
          disabled={staticSetting.disabled}
          endAdornment={staticSetting.label || ''}
          inputProps={
            staticSetting.type === 'number'
              ? {
                  min: staticSetting.min || 0,
                  max: staticSetting.max || 100,
                }
              : undefined
          }
        />
      )
  }
}

const MemoInputType = React.memo(
  InputType,
  (prev, next) =>
    prev.localState?.[prev.subOption || prev.option] ===
    next.localState?.[next.subOption || next.option],
)

function BaseUserOptions() {
  const { t } = useTranslation()
  const { open, category, type } = useLayoutStore((s) => s.dialog)

  const staticUserSettings = useMemory((s) => s.clientMenus[category])

  /** @param {string} label */
  const getLabel = (label) => {
    if (label.startsWith('pvp') && !label.includes('Mega')) {
      return t('pvp_level', { level: label.substring(3) })
    }
    return t(camelToSnake(label), getProperName(label))
  }

  const footerOptions = React.useMemo(
    () =>
      /** @type {import('@components/dialogs/Footer').FooterButton[]} */ ([
        {
          name: 'reset',
          action: () => {
            const existing = useStorage.getState().userSettings
            if (category in existing) {
              const newSettings = {
                ...existing[category],
              }
              Object.entries(staticUserSettings || {}).forEach(
                ([key, value]) => {
                  if (value.sub) {
                    Object.entries(value.sub).forEach(([subKey, subValue]) => {
                      newSettings[subKey] = subValue.value
                    })
                  } else {
                    newSettings[key] = value.value
                  }
                },
              )
              setDeepStore(`userSettings.${category}`, newSettings)
            }
          },
          color: 'primary',
        },
        {
          name: 'close',
          action: toggleDialog(false),
          color: 'secondary',
        },
      ]),
    [category, staticUserSettings],
  )

  return (
    <DialogWrapper
      open={open && type === 'options'}
      maxWidth="md"
      onClose={toggleDialog(false)}
      fullWidth={false}
    >
      <Header
        titles={[`${camelToSnake(category)}_options`]}
        action={toggleDialog(false)}
      />
      <DialogContent sx={{ minWidth: 'min(100%, 350px)' }}>
        <List>
          {category === 'notifications' && (
            <ListItem>
              <ListItemText primaryTypographyProps={{ variant: 'h6' }}>
                {t('notifications_status')}: {t(getPermission())}
              </ListItemText>
            </ListItem>
          )}
          {Object.entries(staticUserSettings || {}).map(([option, values]) => (
            <React.Fragment key={option}>
              <ListItem
                key={option}
                disableGutters
                disablePadding
                style={{ minHeight: 38 }}
              >
                <ListItemText
                  primary={getLabel(option)}
                  primaryTypographyProps={{
                    style: { maxWidth: '80%' },
                  }}
                />
                <MemoInputType category={category} option={option} />
              </ListItem>
              {values.sub &&
                Object.keys(values.sub).map((subOption) => (
                  <ListItem
                    key={subOption}
                    disableGutters
                    disablePadding
                    style={{ minHeight: 38 }}
                  >
                    <ListItemText primary={getLabel(subOption)} />
                    <MemoInputType
                      category={category}
                      option={option}
                      subOption={subOption}
                    />
                  </ListItem>
                ))}
            </React.Fragment>
          ))}
        </List>
      </DialogContent>
      <Footer options={footerOptions} />
    </DialogWrapper>
  )
}

export const UserOptions = React.memo(BaseUserOptions)

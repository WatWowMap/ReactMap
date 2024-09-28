// @ts-nocheck
// TODO: Remove @ts-nocheck

import * as React from 'react'
import DialogContent from '@mui/material/DialogContent'
import Input from '@mui/material/Input'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Switch from '@mui/material/Switch'
import ListSubheader from '@mui/material/ListSubheader'
import { useTranslation } from 'react-i18next'
import RoomIcon from '@mui/icons-material/Room'
import FeedIcon from '@mui/icons-material/Feed'
import OpacityIcon from '@mui/icons-material/Opacity'
import TuneIcon from '@mui/icons-material/Tune'
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates'
import { UseMemory, useMemory } from '@store/useMemory'
import { toggleDialog, useLayoutStore } from '@store/useLayoutStore'
import {
  setDeepStore,
  useDeepStore,
  UseStorage,
  useStorage,
} from '@store/useStorage'
import { getPermission } from '@services/desktopNotification'
import { analytics } from '@utils/analytics'
import { getProperName, camelToSnake } from '@utils/strings'

import { Header } from './Header'
import { Footer, FooterButton } from './Footer'
import { DialogWrapper } from './DialogWrapper'

const ICONS = {
  markers: RoomIcon,
  popups: FeedIcon,
  dynamic_opacity: OpacityIcon,
  filters: TuneIcon,
  tooltips: TipsAndUpdatesIcon,
}

function InputType<T extends keyof UseStorage['userSettings']>({
  option,
  subOption,
  category,
}: {
  category: T
  option: keyof import('@store/useStorage').UseStorage['userSettings'][T]
  subOption?: string
  localState: Record<string, any>
  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
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
          checked={!!userValue}
          color="secondary"
          disabled={staticSetting?.disabled}
          onChange={handleChange}
        />
      )
    default:
      return (
        <Input
          color="secondary"
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
          size="small"
          style={{ width: 50, minHeight: 38 }}
          type={staticSetting.type}
          value={userValue ?? ''}
          onChange={handleChange}
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

  const staticUserSettings = useMemory(
    (s) => s.clientMenus[category as keyof UseMemory['clientMenus']],
  )

  /** @param {string} label */
  const getLabel = (label: string) => {
    if (label.startsWith('pvp') && !label.includes('Mega')) {
      return t('pvp_level', { level: label.substring(3) })
    }

    return t(camelToSnake(label), getProperName(label))
  }

  const footerOptions: FooterButton[] = React.useMemo(
    () => [
      {
        name: 'reset',
        action: () => {
          const existing = useStorage.getState().userSettings

          if (category in existing) {
            const newSettings = {
              ...existing[category],
            }

            Object.entries(staticUserSettings || {}).forEach(([key, value]) => {
              if (value.sub) {
                Object.entries(value.sub).forEach(([subKey, subValue]) => {
                  newSettings[subKey] = subValue.value
                })
              } else {
                newSettings[key] = value.value
              }
            })
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
    ],
    [category, staticUserSettings],
  )

  const staticByCategory: [string, string[]][] = React.useMemo(() => {
    if (!staticUserSettings) return []
    const reduced = Object.entries(staticUserSettings).reduce(
      (acc, [key, value]) => {
        if (!acc[value.category || '']) {
          acc[value.category || ''] = []
        }
        acc[value.category || ''].push(key)

        return acc
      },
      {} as Record<string, string[]>,
    )

    return Object.entries(reduced)
      .sort(([a], [b]) => t(a).localeCompare(t(b)))
      .map(([key, value]) => [key, value])
  }, [staticUserSettings])

  return (
    <DialogWrapper
      maxWidth="sm"
      open={open && type === 'options'}
      variant="large"
      onClose={toggleDialog(false)}
    >
      <Header
        action={toggleDialog(false)}
        titles={[`${camelToSnake(category)}_options`]}
      />
      <DialogContent>
        <List>
          {category === 'notifications' && (
            <ListItem>
              <ListItemText primaryTypographyProps={{ variant: 'h6' }}>
                {t('notifications_status')}: {t(getPermission())}
              </ListItemText>
            </ListItem>
          )}
          {staticByCategory.map(([key, values]) => {
            const Icon = ICONS[key]

            return (
              <React.Fragment key={key}>
                {key && (
                  <ListSubheader
                    disableGutters
                    className="flex-center"
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {key in ICONS && <Icon sx={{ mr: 2 }} />}
                    {t(key)}
                  </ListSubheader>
                )}
                {values.map((option) => (
                  <React.Fragment key={option}>
                    <ListItem key={option} disableGutters disablePadding>
                      <ListItemText primary={getLabel(option)} sx={{ pl: 2 }} />
                      <MemoInputType category={category} option={option} />
                    </ListItem>
                    {!!staticUserSettings[option]?.sub &&
                      Object.keys(staticUserSettings[option].sub).map(
                        (subOption) => (
                          <ListItem
                            key={subOption}
                            disableGutters
                            disablePadding
                          >
                            <ListItemText inset primary={getLabel(subOption)} />
                            <MemoInputType
                              category={category}
                              option={option}
                              subOption={subOption}
                            />
                          </ListItem>
                        ),
                      )}
                  </React.Fragment>
                ))}
              </React.Fragment>
            )
          })}
        </List>
      </DialogContent>
      <Footer options={footerOptions} />
    </DialogWrapper>
  )
}

export const UserOptions = React.memo(BaseUserOptions)

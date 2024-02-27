import * as React from 'react'
import {
  Switch,
  Input,
  DialogContent,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import { useTranslation, Trans } from 'react-i18next'

import Utility from '@services/Utility'
import { useMemory } from '@hooks/useMemory'
import { toggleDialog, useLayoutStore } from '@hooks/useLayoutStore'
import { useStorage } from '@hooks/useStorage'
import { getPermission } from '@services/desktopNotification'

import Header from '../general/Header'
import Footer from '../general/Footer'
import { DialogWrapper } from './DialogWrapper'

function InputType({ option, subOption, localState, handleChange, category }) {
  const staticUserSettings = useMemory.getState().clientMenus[category] || {}
  const fullOption = subOption
    ? staticUserSettings[option].sub[subOption]
    : staticUserSettings[option]

  switch (fullOption.type) {
    case 'bool':
      return (
        <Switch
          color="secondary"
          checked={!!localState?.[subOption || option] || false}
          name={subOption || option}
          onChange={handleChange}
          disabled={fullOption.disabled}
        />
      )
    default:
      return (
        <Input
          color="secondary"
          id={subOption || option}
          label={subOption || option}
          name={subOption || option}
          style={{ width: 50 }}
          value={localState?.[subOption || option] || ''}
          onChange={handleChange}
          variant="outlined"
          size="small"
          type={fullOption.type}
          disabled={fullOption.disabled}
          endAdornment={fullOption.label || ''}
          inputProps={{
            min: fullOption.min || 0,
            max: fullOption.max || 100,
          }}
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

function UserOptions() {
  const { t } = useTranslation()
  const { open, category, type } = useLayoutStore((s) => s.dialog)

  const staticUserSettings = useMemory((s) => s.clientMenus[category] || {})
  const userSettings = useStorage((s) => s.userSettings)

  const [localState, setLocalState] = React.useState(userSettings[category])

  const handleChange = (event) => {
    const { name, value, checked, type: eType } = event.target
    if (eType === 'checkbox') {
      setLocalState((prev) => ({ ...prev, [name]: checked }))
    } else if (value) {
      setLocalState((prev) => ({ ...prev, [name]: value }))
    } else {
      setLocalState((prev) => ({ ...prev, [name]: !localState[name] }))
    }
    Utility.analytics(
      'User Options',
      `Name: ${name} New Value: ${value || !localState[name]}`,
      category,
    )
  }

  const getLabel = (label) => {
    if (label.startsWith('pvp') && !label.includes('Mega')) {
      return <Trans i18nKey="pvp_level">{{ level: label.substring(3) }}</Trans>
    }
    return t(Utility.camelToSnake(label), Utility.getProperName(label))
  }

  const footerOptions = React.useMemo(
    () =>
      /** @type {import('@components/layout/general/Footer').FooterButton[]} */ ([
        {
          name: 'reset',
          action: () => {
            const newSettings = { ...userSettings[category] }
            Object.entries(staticUserSettings || {}).forEach(([key, value]) => {
              if (value.sub) {
                Object.entries(value.sub).forEach(([subKey, subValue]) => {
                  newSettings[subKey] = subValue.value
                })
              } else {
                newSettings[key] = value.value
              }
            })
            setLocalState(newSettings)
          },
          icon: 'Replay',
          color: 'primary',
        },
        {
          name: 'save',
          action: toggleDialog(false, category, 'options', localState),
          icon: 'Save',
          color: 'secondary',
        },
      ]),
    [category, userSettings, staticUserSettings, localState],
  )

  React.useEffect(() => {
    setLocalState(userSettings[category])
  }, [category, userSettings[category]])

  return (
    <DialogWrapper
      open={open && type === 'options'}
      maxWidth="md"
      onClose={toggleDialog(false, category, type)}
      fullWidth={false}
    >
      <Header
        titles={[`${Utility.camelToSnake(category)}_options`]}
        action={toggleDialog(false, category, 'options')}
      />
      <DialogContent sx={{ minWidth: 'min(100vw, 350px)' }}>
        <List>
          {category === 'notifications' && (
            <ListItem>
              <ListItemText primaryTypographyProps={{ variant: 'h6' }}>
                {t('notifications_status')}: {t(getPermission())}
              </ListItemText>
            </ListItem>
          )}
          {Object.entries(staticUserSettings).map(([option, values]) => (
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
                <MemoInputType
                  option={option}
                  localState={localState}
                  handleChange={handleChange}
                  category={category}
                />
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
                      option={option}
                      subOption={subOption}
                      localState={localState}
                      handleChange={handleChange}
                      category={category}
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

export default React.memo(UserOptions)

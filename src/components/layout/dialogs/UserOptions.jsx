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
import { useStatic, useStore } from '@hooks/useStore'
import Header from '../general/Header'
import Footer from '../general/Footer'

function InputType({ option, subOption, localState, handleChange, category }) {
  const staticUserSettings = useStatic.getState().userSettings[category] || {}
  const fullOption = subOption
    ? staticUserSettings[option].sub[subOption]
    : staticUserSettings[option]

  switch (fullOption.type) {
    case 'bool':
      return (
        <Switch
          color="secondary"
          checked={!!localState[subOption || option]}
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
          value={localState[subOption || option]}
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
    prev.localState[prev.subOption || prev.option] ===
    next.localState[next.subOption || next.option],
)

export default function UserOptions({ category, toggleDialog }) {
  const { t } = useTranslation()
  const staticUserSettings = useStatic.getState().userSettings[category] || {}
  const userSettings = useStore((state) => state.userSettings)

  const [localState, setLocalState] = React.useState(userSettings[category])

  const handleChange = React.useCallback(
    (event) => {
      const { name, value, checked, type } = event.target
      if (type === 'checkbox') {
        setLocalState({ ...localState, [name]: checked })
      } else if (value) {
        setLocalState({ ...localState, [name]: value })
      } else {
        setLocalState({ ...localState, [name]: !localState[name] })
      }
      Utility.analytics(
        'User Options',
        `Name: ${name} New Value: ${value || !localState[name]}`,
        category,
      )
    },
    [category, localState],
  )

  const getLabel = (label) => {
    if (label.startsWith('pvp') && !label.includes('Mega')) {
      return <Trans i18nKey="pvp_level">{{ level: label.substring(3) }}</Trans>
    }
    return t(Utility.camelToSnake(label), Utility.getProperName(label))
  }

  return (
    <>
      <Header
        titles={[`${Utility.camelToSnake(category)}_options`]}
        action={toggleDialog(false, category, 'options')}
      />
      <DialogContent sx={{ minWidth: 'min(100vw, 350px)' }}>
        <List>
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
      <Footer
        options={[
          {
            name: 'reset',
            action: () => {
              const newSettings = { ...userSettings[category] }
              Object.entries(staticUserSettings).forEach(([key, value]) => {
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
        ]}
      />
    </>
  )
}

import React, { Fragment, useState } from 'react'
import {
  Switch,
  Input,
  AppBar,
  Tab,
  Tabs,
  DialogContent,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import { useTranslation, Trans } from 'react-i18next'

import Utility from '@services/Utility'
import { useStatic, useStore } from '@hooks/useStore'
import TabPanel from '../general/TabPanel'
import Header from '../general/Header'
import Footer from '../general/Footer'

export default function UserOptions({ category, toggleDialog }) {
  const { t } = useTranslation()
  const { [category]: staticUserSettings } = useStatic(
    (state) => state.userSettings,
  )
  const userSettings = useStore((state) => state.userSettings)

  const [localState, setLocalState] = useState(userSettings[category])
  const [tab, setTab] = useState(0)
  const [tabPages] = useState(
    Array.from(
      {
        length: Math.ceil(Object.keys(staticUserSettings).length / 10),
      },
      (v, i) => i,
    ),
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    if (value) {
      setLocalState({ ...localState, [name]: value })
    } else {
      setLocalState({ ...localState, [name]: !localState[name] })
    }
    Utility.analytics(
      'User Options',
      `Name: ${name} New Value: ${value || !localState[name]}`,
      category,
    )
  }

  const handleTabChange = (_, newValue) => setTab(newValue)

  const getLabel = (label) => {
    if (label.startsWith('pvp') && !label.includes('Mega')) {
      return <Trans i18nKey="pvp_level">{{ level: label.substring(3) }}</Trans>
    }
    return t(Utility.camelToSnake(label), Utility.getProperName(label))
  }

  const getInputType = (option, subOption) => {
    const fullOption = subOption
      ? staticUserSettings[option].sub[subOption]
      : staticUserSettings[option]

    switch (fullOption.type) {
      case 'bool':
        return (
          <Switch
            color="secondary"
            checked={localState[subOption || option]}
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

  return (
    <>
      <Header
        titles={[`${Utility.camelToSnake(category)}_options`]}
        action={toggleDialog(false, category, 'options')}
      />
      <DialogContent sx={{ p: 0, minWidth: 'min(100vw, 300px)' }}>
        {tabPages.length > 1 && (
          <AppBar position="static">
            <Tabs
              value={tab}
              onChange={handleTabChange}
              indicatorColor="secondary"
              variant="fullWidth"
              textColor="inherit"
            >
              {tabPages.map((each) => (
                <Tab
                  key={each}
                  label={<Trans i18nKey="page">{{ page: each + 1 }}</Trans>}
                  style={{ width: 40, minWidth: 40 }}
                />
              ))}
            </Tabs>
          </AppBar>
        )}
        {tabPages.map((each) => (
          <TabPanel value={tab} index={each} key={each}>
            <List>
              {Object.entries(staticUserSettings).map(([key, values], j) => {
                const start = each * 10
                const end = each * 10 + 10
                if (j < start) return null
                if (j >= end) return null
                return (
                  <Fragment key={key}>
                    <ListItem key={key} disableGutters disablePadding>
                      <ListItemText primary={getLabel(key)} />
                      {getInputType(key)}
                    </ListItem>
                    {values.sub &&
                      Object.keys(values.sub).map((subOption) => (
                        <ListItem key={subOption} disableGutters disablePadding>
                          <ListItemText primary={getLabel(subOption)} />
                          {getInputType(key, subOption)}
                        </ListItem>
                      ))}
                  </Fragment>
                )
              })}
            </List>
          </TabPanel>
        ))}
      </DialogContent>
      <Footer
        options={[
          {
            name: 'reset',
            action: () => setLocalState(userSettings[category]),
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

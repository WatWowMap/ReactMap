// @ts-check
import * as React from 'react'
import Person from '@mui/icons-material/Person'
import { DialogContent, AppBar, Tabs, Tab, Collapse } from '@mui/material'

import { useTranslation, Trans } from 'react-i18next'
import { useQuery } from '@apollo/client'

import { useLayoutStore, useStatic, useStore } from '@hooks/useStore'
import Poracle from '@services/Poracle'
import Utility from '@services/Utility'
import Footer from '@components/layout/general/Footer'
import TabPanel from '@components/layout/general/TabPanel'
import Header from '@components/layout/general/Header'
import { allProfiles } from '@services/queries/webhook'

import NewPokemon from './tiles/WebhookTile'
import Human from './human'
import Tracked from './Tracked'
import Menu from '../../general/Menu'
import WebhookError from './Error'
import ProfileEditing from './ProfileEditing'
import { setMode, setSend, useWebhookStore } from './store'

export default function Manage() {
  const Icons = useStatic((s) => s.Icons)

  const webhookData = useWebhookStore((s) => s.data)

  const { t } = useTranslation()

  const { data } = useQuery(allProfiles, {
    fetchPolicy: 'no-cache',
  })

  const staticFilters = useStatic((s) => s.filters)
  const invasions = useStatic((s) => s.masterfile.invasions)
  const feedbackLink = useStatic((s) => s.config.map.feedbackLink)

  const send = useWebhookStore((s) => s.send)

  const poracleFilters = React.useMemo(
    () => Poracle.filterGenerator(webhookData, staticFilters, invasions),
    [],
  )

  const [tabValue, setTabValue] = React.useState(0)
  const [addNew, setAddNew] = React.useState(false)

  const filteredData = Object.keys(
    webhookData[selectedWebhook]?.info || {},
  ).filter(
    (key) =>
      key &&
      (!webhookData[selectedWebhook]?.human?.blocked_alerts ||
        (key === 'pokemon'
          ? !webhookData[selectedWebhook].human.blocked_alerts.includes(
              'monster',
            )
          : !webhookData[selectedWebhook].human.blocked_alerts.includes(key))),
  )
  const webhookCategory = filteredData[tabValue]

  Utility.analytics(
    'Webhook',
    // `${webhookCategory} Webhook Page`,
    // webhookCategory,
    true,
  )

  const [tempFilters, setTempFilters] = React.useState(
    poracleFilters[webhookCategory],
  )

  const footerButtons = React.useMemo(
    () => [
      {
        name: tabValue ? (
          <Trans i18nKey="add_new">
            {{ category: t(filteredData[tabValue]) }}
          </Trans>
        ) : (
          t('manage_profiles')
        ),
        action: () => setAddNew(true),
        key: 'addNew',
        disabled: !webhookData[selectedWebhook]?.human,
      },
      {
        name: 'close',
        action: setMode,
        icon: 'Close',
        color: 'primary',
      },
      ...(feedbackLink
        ? [
            {
              name: 'feedback',
              action: () => useLayoutStore.setState({ feedback: true }),
              icon: 'BugReport',
              disabled: !webhookData[selectedWebhook].human,
              color: 'success',
            },
          ]
        : []),
    ],
    [],
  )

  const handleClose = React.useCallback(
    (save) => {
      if (addNew) {
        setAddNew(false)
        if (save === 'profiles') {
          syncWebhook({
            variables: {
              category: 'allProfiles',
              data: null,
              status: 'GET',
              name: selectedWebhook,
            },
          })
        } else if (save) {
          setSend(true)
        } else {
          setTempFilters(poracleFilters[webhookCategory])
        }
      } else {
        setMode()
      }
    },
    [selectedWebhook, webhookCategory, poracleFilters, addNew],
  )

  React.useEffect(() => {
    if (tabValue) {
      setTempFilters(poracleFilters[webhookCategory])
    } else {
      // Syncs when back on the human tab
      syncWebhook({
        variables: {
          category: 'allProfiles',
          data: null,
          status: 'GET',
          name: selectedWebhook,
        },
      })
    }
  }, [tabValue])

  React.useEffect(() => {
    console.log(webhookData, selectedWebhook, data)

    if (data?.webhook) {
      useWebhookStore.setState((prev) => ({
        data: {
          ...prev.data,
          [selectedWebhook]: {
            ...prev.data[selectedWebhook],
            ...data.webhook,
          },
        },
      }))
    }
  }, [data])

  return (
    <>
      <Header
        names={[selectedWebhook]}
        action={handleClose}
        titles={['manage_webhook']}
      />
      <Collapse in={!addNew}>
        <AppBar position="static">
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
          >
            {filteredData.map((each) => (
              <Tab
                key={each}
                icon={
                  each === 'human' ? (
                    <Person />
                  ) : (
                    <img
                      src={Icons.getMisc(each)}
                      style={{ maxWidth: 20, height: 'auto' }}
                      alt={each}
                    />
                  )
                }
                style={{ minWidth: 5 }}
              />
            ))}
          </Tabs>
        </AppBar>
        <DialogContent sx={{ padding: 0, height: { xs: '100%', sm: '70vh' } }}>
          {webhookData[selectedWebhook].human && !poracleFilters.error ? (
            filteredData.map((key, i) => (
              <TabPanel value={tabValue} index={i} key={key} virtual>
                {key === 'human' ? (
                  <Human />
                ) : (
                  <Tracked
                    category={key}
                    selectedWebhook={selectedWebhook}
                    tempFilters={tempFilters}
                    setTempFilters={setTempFilters}
                    send={send}
                  />
                )}
              </TabPanel>
            ))
          ) : (
            <WebhookError selectedWebhook={selectedWebhook}>
              {poracleFilters.error}
            </WebhookError>
          )}
        </DialogContent>
      </Collapse>
      {/* 
      <Collapse in={addNew}>
        {webhookCategory === 'human' ? (
          <ProfileEditing handleClose={handleClose} />
        ) : (
          <Menu
            category={Poracle.getMapCategory(webhookCategory)}
            categories={Poracle.getFilterCategories(webhookCategory)}
            webhookCategory={webhookCategory}
            filters={poracleFilters[webhookCategory]}
            tempFilters={tempFilters}
            setTempFilters={setTempFilters}
            title="webhook_selection"
            titleAction={() => handleClose(false)}
            Tile={NewPokemon}
            extraButtons={[
              {
                name: 'save',
                action: () => handleClose(true),
                icon: 'Save',
                color: 'secondary',
              },
            ]}
          />
        )}
      </Collapse> */}

      <Footer options={footerButtons} role="webhook_footer" />
    </>
  )
}

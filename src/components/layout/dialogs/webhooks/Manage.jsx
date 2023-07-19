/* eslint-disable max-len */
import React, { useState, useEffect, useMemo } from 'react'
import Person from '@material-ui/icons/Person'
import { DialogContent, Dialog, AppBar, Tabs, Tab } from '@material-ui/core'

import { useTranslation, Trans } from 'react-i18next'
import { useLazyQuery } from '@apollo/client'

import Query from '@services/Query'
import { useStatic } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'
import Poracle from '@services/Poracle'
import Utility from '@services/Utility'

import Footer from '@components/layout/general/Footer'
import TabPanel from '@components/layout/general/TabPanel'
import Header from '@components/layout/general/Header'
import NewPokemon from './tiles/WebhookTile'
import Human from './Human'
import Tracked from './Tracked'
import Menu from '../../general/Menu'
import WebhookError from './Error'
import ProfileEditing from './ProfileEditing'
import Feedback from '../Feedback'

export default function Manage({
  Icons,
  isMobile,
  isTablet,
  selectedWebhook,
  setSelectedWebhook,
  setWebhookMode,
  webhookMode,
  selectedAreas,
  setSelectedAreas,
  webhookLocation,
  setWebhookLocation,
  webhookData,
  setWebhookData,
  handleWebhookClose,
}) {
  const { t } = useTranslation()
  const classes = useStyles()
  const [syncWebhook, { data }] = useLazyQuery(Query.webhook('allProfiles'), {
    fetchPolicy: 'no-cache',
  })

  const staticFilters = useStatic((s) => s.filters)
  const { invasions } = useStatic((s) => s.masterfile)
  const { map } = useStatic((s) => s.config)
  const setWebhookAlert = useStatic((state) => state.setWebhookAlert)
  const poracleFilters = useMemo(
    () =>
      Poracle.filterGenerator(
        webhookData[selectedWebhook],
        staticFilters,
        invasions,
      ),
    [],
  )
  const [tabValue, setTabValue] = useState(0)
  const [feedback, setFeedback] = useState(false)
  const [addNew, setAddNew] = useState(false)
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
    `${webhookCategory} Webhook Page`,
    webhookCategory,
    true,
  )

  const [tempFilters, setTempFilters] = useState(
    poracleFilters[webhookCategory],
  )
  const [send, setSend] = useState(false)

  const footerButtons = [
    {
      name: tabValue ? (
        <Trans i18nKey="add_new">
          {{ category: t(filteredData[tabValue]) }}
        </Trans>
      ) : (
        t('manage_profiles')
      ),
      action: () => setAddNew(true),
      icon: tabValue ? 'Add' : 'People',
      key: 'addNew',
      disabled: !webhookData[selectedWebhook]?.human,
    },
    {
      name: 'close',
      action: handleWebhookClose,
      icon: 'Close',
      color: 'primary',
    },
  ]

  if (map.feedbackLink) {
    footerButtons.unshift({
      name: 'feedback',
      action: () => setFeedback(true),
      icon: 'BugReport',
      disabled: !webhookData[selectedWebhook].human,
      color: '#00e676',
    })
  }

  const handleClose = (save) => {
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
  }

  useEffect(() => {
    if (tabValue) {
      setTempFilters(poracleFilters[webhookCategory])
    } else {
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

  useEffect(() => {
    if (data?.webhook) {
      setWebhookData({
        ...webhookData,
        [selectedWebhook]: {
          ...webhookData[selectedWebhook],
          ...data.webhook,
        },
      })
    }
  }, [data])

  return (
    <>
      <Header
        names={[selectedWebhook]}
        action={handleWebhookClose}
        titles={['manage_webhook']}
      />
      <AppBar position="static">
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="secondary"
          variant="fullWidth"
          style={{ backgroundColor: '#424242', width: '100%' }}
        >
          {filteredData.map((each) => (
            <Tab
              key={each}
              icon={
                each === 'human' ? (
                  <Person style={{ color: 'white ' }} />
                ) : (
                  <img
                    src={Icons.getMisc(each)}
                    style={{ maxWidth: 20, height: 'auto' }}
                    alt={each}
                  />
                )
              }
              style={{ width: 40, minWidth: 40 }}
            />
          ))}
        </Tabs>
      </AppBar>
      <DialogContent style={{ padding: 0, height: isMobile ? '100%' : '70vh' }}>
        {webhookData[selectedWebhook].human && !poracleFilters.error ? (
          filteredData.map((key, i) => (
            <TabPanel value={tabValue} index={i} key={key} virtual>
              {key === 'human' ? (
                <Human
                  t={t}
                  isMobile={isMobile}
                  webhookData={webhookData}
                  setWebhookData={setWebhookData}
                  webhookMode={webhookMode}
                  setWebhookMode={setWebhookMode}
                  webhookLocation={webhookLocation}
                  setWebhookLocation={setWebhookLocation}
                  selectedAreas={selectedAreas}
                  setSelectedAreas={setSelectedAreas}
                  selectedWebhook={selectedWebhook}
                  setSelectedWebhook={setSelectedWebhook}
                  setWebhookAlert={setWebhookAlert}
                  addNew={addNew}
                />
              ) : (
                <Tracked
                  t={t}
                  Icons={Icons}
                  category={key}
                  isMobile={isMobile}
                  webhookData={webhookData}
                  setWebhookData={setWebhookData}
                  selectedWebhook={selectedWebhook}
                  tempFilters={tempFilters}
                  setTempFilters={setTempFilters}
                  send={send}
                  setSend={setSend}
                  Poracle={Poracle}
                  setWebhookAlert={setWebhookAlert}
                  addNew={addNew}
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
      <Footer options={footerButtons} role="webhook_footer" />
      <Dialog
        classes={{
          scrollPaper: classes.scrollPaper,
          container: classes.container,
        }}
        fullWidth={!isMobile}
        fullScreen={isMobile}
        maxWidth="md"
        open={addNew}
        onClose={handleClose}
      >
        {webhookCategory === 'human' ? (
          <ProfileEditing
            webhookData={webhookData}
            setWebhookData={setWebhookData}
            selectedWebhook={selectedWebhook}
            handleClose={handleClose}
            isMobile={isMobile}
          />
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
            isMobile={isMobile}
            isTablet={isTablet}
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
      </Dialog>
      <Dialog
        classes={{
          scrollPaper: classes.scrollPaper,
          container: classes.container,
        }}
        maxWidth="xs"
        open={feedback}
        onClose={() => setFeedback(false)}
      >
        <Feedback link={map.feedbackLink} setFeedback={setFeedback} />
      </Dialog>
    </>
  )
}

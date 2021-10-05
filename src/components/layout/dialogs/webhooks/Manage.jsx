import React, { useState } from 'react'
import {
  DialogContent,
  Dialog,
  AppBar,
  Tabs,
  Tab,
} from '@material-ui/core'
import { Person } from '@material-ui/icons'
import { useTranslation, Trans } from 'react-i18next'
import { useStatic } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'

import Footer from '@components/layout/general/Footer'
import TabPanel from '@components/layout/general/TabPanel'
import Header from '@components/layout/general/Header'
import Human from './Human'
import Pokemon from './Pokemon'
import Menu from '../filters/Menu'

const ignoredKeys = ['message', 'error', 'statusCode', 'status', 'profile', 'name', 'areas', 'addressFormat', 'message', 'category', 'weather', '__typename']

export default function Manage({
  Icons, isMobile, isTablet,
  selectedWebhook, setSelectedWebhook,
  setWebhookMode, webhookMode,
  selectedAreas, setSelectedAreas,
  webhookLocation, setWebhookLocation,
}) {
  const { t } = useTranslation()
  const classes = useStyles()
  const webhookData = useStatic(s => s.webhookData)
  const [tabValue, setTabValue] = useState(4)
  const [help, setHelp] = useState(false)
  const [addNew, setAddNew] = useState(false)
  const staticFilters = useStatic(s => s.filters)

  const filteredData = Object.keys(webhookData[selectedWebhook]).filter(key => !ignoredKeys.includes(key))
  const footerButtons = [
    { name: 'help', action: () => setHelp(true), icon: 'HelpOutline' },
    { name: <Trans i18nKey="addNew">{{ category: t(filteredData[tabValue]) }}</Trans>, action: () => setAddNew(true), icon: 'Add', key: 'addNew' },
    { name: 'close', action: () => setWebhookMode(false), icon: 'Close' },
  ]

  console.log(filteredData[tabValue])
  return (
    <>
      <Header name={selectedWebhook} action={() => setWebhookMode(false)} title="manageWebhook" />
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
              icon={each === 'human'
                ? <Person style={{ color: 'white ' }} />
                : <img src={Icons.getMisc(each)} style={{ maxWidth: 20, height: 'auto' }} />}
              style={{ width: 40, minWidth: 40 }}
            />
          ))}
        </Tabs>
      </AppBar>
      <DialogContent style={{ padding: '0', height: isMobile ? '100%' : '70vh' }}>
        {filteredData.map((key, i) => (
          <TabPanel value={tabValue} index={i} key={key} virtual>
            {{
              human: (
                <Human
                  t={t}
                  isMobile={isMobile}
                  webhookData={webhookData}
                  webhookMode={webhookMode}
                  setWebhookMode={setWebhookMode}
                  webhookLocation={webhookLocation}
                  setWebhookLocation={setWebhookLocation}
                  selectedAreas={selectedAreas}
                  setSelectedAreas={setSelectedAreas}
                  selectedWebhook={selectedWebhook}
                  setSelectedWebhook={setSelectedWebhook}
                />
              ),
              pokemon: (
                <Pokemon
                  t={t}
                  Icons={Icons}
                  isMobile={isMobile}
                  webhookData={webhookData}
                  selectedWebhook={selectedWebhook}
                />
              ),
            }[key]}
          </TabPanel>
        ))}
      </DialogContent>
      <Footer options={footerButtons} role="webhookFooter" />
      <Dialog
        classes={{
          scrollPaper: classes.scrollPaper,
          container: classes.container,
        }}
        fullWidth={!isMobile}
        fullScreen={isMobile}
        maxWidth="md"
        open={addNew}
        onClose={() => setAddNew(false)}
      >
        <Menu
          category={filteredData[tabValue]}
          filters={staticFilters[filteredData[tabValue]]
            || staticFilters[`${filteredData[tabValue]}s`]}
          isMobile={isMobile}
          isTablet={isTablet}
          toggleDialog={() => setAddNew(false)}
          webhook
        />
      </Dialog>
      <Dialog
        classes={{
          scrollPaper: classes.scrollPaper,
          container: classes.container,
        }}
        maxWidth="xs"
        open={help}
        onClose={() => setHelp(false)}
      >
        {t('help')}
      </Dialog>
    </>
  )
}

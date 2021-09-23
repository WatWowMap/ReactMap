import React, { useState } from 'react'
import {
  DialogContent,
  Dialog,
  AppBar,
  Tabs,
  Tab,
} from '@material-ui/core'
import { Person } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'
import { useStatic } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'

import Footer from '@components/layout/general/Footer'
import TabPanel from '@components/layout/general/TabPanel'
import Header from '@components/layout/general/Header'
import Human from './Human'

const ignoredKeys = ['message', 'error', 'statusCode', 'status', 'profile', 'name', 'areas', 'addressFormat', 'message', 'category', 'weather', '__typename']

export default function Manage({
  Icons, isMobile,
  selectedWebhook, setSelectedWebhook,
  setWebhookMode, webhookMode,
  selectedAreas, setSelectedAreas,
  webhookLocation, setWebhookLocation,
}) {
  const { t } = useTranslation()
  const classes = useStyles()
  const webhookData = useStatic(s => s.webhookData)
  const [tabValue, setTabValue] = useState(0)
  const [help, setHelp] = useState(false)
  const [addNew, setAddNew] = useState(false)

  const footerButtons = [
    { name: 'help', action: () => setHelp(true), icon: 'HelpOutline' },
    { name: 'addNew', action: () => setAddNew(true), icon: 'Add' },
    { name: 'close', action: () => setWebhookMode(false), icon: 'Close' },
  ]
  const filteredData = Object.keys(webhookData[selectedWebhook]).filter(key => !ignoredKeys.includes(key))

  return (
    <>
      <Header name={selectedWebhook} action={() => setWebhookMode(false)} />
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
      <DialogContent>
        {filteredData.map((key, i) => (
          <TabPanel value={tabValue} index={i} key={key}>
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
            }[key]}
          </TabPanel>
        ))}
      </DialogContent>
      <Footer options={footerButtons} />
      <Dialog
        classes={{
          scrollPaper: classes.scrollPaper,
          container: classes.container,
        }}
        maxWidth="xs"
        open={addNew}
        onClose={() => setAddNew(false)}
      >
        {t('addNew')}
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

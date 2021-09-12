import React, { useState, useCallback, useEffect } from 'react'
import {
  DialogContent,
  Dialog,
  AppBar,
  Tabs,
  Tab,
} from '@material-ui/core'
import { Person } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'
import shallow from 'zustand/shallow'

import { useStatic, useStore } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'
import Footer from '@components/layout/general/Footer'
import TabPanel from '@components/layout/general/TabPanel'
import Header from '@components/layout/general/Header'
import Human from './Human'

const ignoredKeys = ['message', 'error', 'statusCode', 'status', 'profile', 'name', 'areas', 'addressFormat']

export default function Manage({
  map, toggleDialog, Icons, setWebhookMode, webhookMode, selectedAreas, setSelectedAreas, scanAreasOn, isMobile,
}) {
  const { t } = useTranslation()
  const classes = useStyles()
  const [webhookData, setWebhookData] = useStatic(useCallback(s => [s.webhookData, s.setWebhookData], []), shallow)
  const [location, setLocation] = useStore(s => [s.location, s.setLocation], shallow)

  const [tabValue, setTabValue] = useState(0)
  const [help, setHelp] = useState(false)
  const [addNew, setAddNew] = useState(false)

  const handleWebhookChanges = useCallback((category, field, value) => {
    if (category === 'human') {
      const newProfile = webhookData.profile.find(p => p.profile_no === value)
      setWebhookData({
        ...webhookData,
        human: {
          ...webhookData.human,
          [field]: value,
          latitude: newProfile.latitude,
          longitude: newProfile.longitude,
          area: newProfile.area,
        },
      })
    }
  }, [])

  const handleLocationChange = useCallback((newValue, updateLocation) => {
    if (updateLocation) {
      map.flyTo([newValue.latitude, newValue.longitude], 16)
      setLocation([newValue.latitude, newValue.longitude])
    }
    setWebhookData({
      ...webhookData,
      human: {
        ...webhookData.human,
        latitude: newValue.latitude,
        longitude: newValue.longitude,
      },
    })
  }, [webhookData])

  useEffect(() => {
    if (webhookMode !== 'areas') {
      handleLocationChange({ latitude: location[0], longitude: location[1] }, false)
    }
  }, [location])

  useEffect(() => {
    const { latitude, longitude } = webhookData.human
    if (parseInt(latitude) || parseInt(longitude)) {
      map.panTo([latitude, longitude])
      setLocation([latitude, longitude])
    }
  }, [])

  const footerButtons = [
    { name: 'help', action: () => setHelp(true), icon: 'HelpOutline' },
    { name: 'addNew', action: () => setAddNew(true), icon: 'Add' },
    { name: 'close', action: toggleDialog(false, '', 'webhook', scanAreasOn), icon: 'Close' },
  ]
  const filteredData = Object.keys(webhookData).filter(key => !ignoredKeys.includes(key))

  return (
    <>
      <Header name={webhookData.name} action={toggleDialog(false, '', 'webhook', scanAreasOn)} />
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
                  setWebhookMode={setWebhookMode}
                  location={location}
                  handleLocationChange={handleLocationChange}
                  humanData={webhookData[key]}
                  profileData={webhookData.profile}
                  areas={webhookData.areas}
                  addressFormat={webhookData.addressFormat}
                  handleWebhookChanges={handleWebhookChanges}
                  t={t}
                  map={map}
                  selectedAreas={selectedAreas}
                  setSelectedAreas={setSelectedAreas}
                  isMobile={isMobile}
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

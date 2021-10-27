import React, { useState, useEffect, useMemo } from 'react'
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
import Poracle from '@services/Poracle'

import Footer from '@components/layout/general/Footer'
import TabPanel from '@components/layout/general/TabPanel'
import Header from '@components/layout/general/Header'
import NewPokemon from './tiles/WebhookTile'
import Human from './Human'
import Tracked from './Tracked'
import Menu from '../../general/Menu'
import WebhookError from './Error'
import ProfileEditing from './ProfileEditing'

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
  const setWebhookData = useStatic(s => s.setWebhookData)
  const staticFilters = useStatic(s => s.filters)
  const { invasions } = useStatic(s => s.masterfile)
  const poracleFilters = useMemo(() => Poracle.filterGenerator(
    webhookData[selectedWebhook], staticFilters, invasions,
  ), [])
  const [tabValue, setTabValue] = useState(0)
  const [help, setHelp] = useState(false)
  const [addNew, setAddNew] = useState(false)
  const filteredData = Object.keys(webhookData[selectedWebhook]?.info || {}).map(key => key)
  const webhookCategory = filteredData[tabValue]

  const [tempFilters, setTempFilters] = useState(poracleFilters[webhookCategory])
  const [send, setSend] = useState(false)

  const footerButtons = [
    { name: 'help', action: () => setHelp(true), icon: 'HelpOutline', disabled: !webhookData[selectedWebhook].human },
    { name: tabValue ? <Trans i18nKey="addNew">{{ category: t(filteredData[tabValue]) }}</Trans> : t('manage_profiles'), action: () => setAddNew(true), icon: 'Add', key: 'addNew', disabled: !webhookData[selectedWebhook].human },
    { name: 'close', action: () => setWebhookMode(false), icon: 'Close' },
  ]

  const handleClose = (save) => {
    setAddNew(false)
    if (save) {
      setSend(true)
    } else {
      setTempFilters(poracleFilters[webhookCategory])
    }
  }

  useEffect(() => {
    if (tabValue) {
      setTempFilters(poracleFilters[webhookCategory])
    }
  }, [tabValue])

  return (
    <>
      <Header names={[selectedWebhook]} action={() => setWebhookMode(false)} titles={['manageWebhook']} />
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
        {webhookData[selectedWebhook].human && !poracleFilters.error ? filteredData.map((key, i) => (
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
              />
            ) : (
              <Tracked
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
              />
            )}
          </TabPanel>
        )) : <WebhookError selectedWebhook={selectedWebhook} />}
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
              { name: 'save', action: () => handleClose(true), icon: 'Save', color: 'secondary' },
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
        open={help}
        onClose={() => setHelp(false)}
      >
        {t('help')}
      </Dialog>
    </>
  )
}

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
import NewPokemon from './tiles/PokemonMenu'
import Human from './Human'
import Pokemon from './Pokemon'
import Menu from '../../general/Menu'

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

  const [tabValue, setTabValue] = useState(0)
  const [help, setHelp] = useState(false)
  const [addNew, setAddNew] = useState(false)
  const filteredData = Object.keys(webhookData[selectedWebhook].info).map(key => key)

  const [tempFilters, setTempFilters] = useState({})
  const [send, setSend] = useState(false)

  const footerButtons = [
    { name: 'help', action: () => setHelp(true), icon: 'HelpOutline' },
    { name: tabValue ? <Trans i18nKey="addNew">{{ category: t(filteredData[tabValue]) }}</Trans> : t('addNewProfile'), action: () => setAddNew(true), icon: 'Add', key: 'addNew' },
    { name: 'close', action: () => setWebhookMode(false), icon: 'Close' },
  ]

  const handleClose = () => {
    setAddNew(false)
    setSend(true)
  }

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
        {filteredData.map((key, i) => (
          <TabPanel value={tabValue} index={i} key={key} virtual>
            {{
              human: (
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
              ),
              pokemon: (
                <Pokemon
                  Icons={Icons}
                  isMobile={isMobile}
                  webhookData={webhookData}
                  setWebhookData={setWebhookData}
                  selectedWebhook={selectedWebhook}
                  tempFilters={tempFilters}
                  setTempFilters={setTempFilters}
                  send={send}
                  setSend={setSend}
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
        onClose={handleClose}
      >
        <Menu
          category={filteredData[tabValue]}
          filters={staticFilters[filteredData[tabValue]]
            || staticFilters[`${filteredData[tabValue]}s`]}
          tempFilters={tempFilters}
          setTempFilters={setTempFilters}
          title="Step 1"
          titleAction={handleClose}
          isMobile={isMobile}
          isTablet={isTablet}
          Tile={NewPokemon}
          extraButtons={[
            { name: 'next', action: handleClose, icon: 'Save', color: 'secondary' },
          ]}
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

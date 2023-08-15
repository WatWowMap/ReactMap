// @ts-check
import * as React from 'react'
import Person from '@mui/icons-material/Person'
import { DialogContent, AppBar, Tabs, Tab, Collapse } from '@mui/material'
import Box from '@mui/material/Box'
import { useTranslation, Trans } from 'react-i18next'

import { useLayoutStore, useStatic, useStore } from '@hooks/useStore'
import Poracle from '@services/Poracle'
import Utility from '@services/Utility'
import Footer from '@components/layout/general/Footer'
import TabPanel from '@components/layout/general/TabPanel'
import Header from '@components/layout/general/Header'

import NewPokemon from './tiles/WebhookTile'
import Human from './human'
import Tracked from './Tracked'
import Menu from '../../general/Menu'
import WebhookError from './Error'
import ProfileEditing from './ProfileEditing'
import { setMode, useWebhookStore } from './store'
import { useGetHookContext } from './hooks'

export default function Manage() {
  const { t } = useTranslation()

  const categories = useGetHookContext()

  // const staticFilters = useStatic((s) => s.filters)
  // const invasions = useStatic((s) => s.masterfile.invasions)
  const feedbackLink = useStatic((s) => s.config.map.feedbackLink)
  // const send = useWebhookStore((s) => s.send)
  const category = useWebhookStore((s) => s.category)
  const name = useWebhookStore((s) => s.context.name) || ''

  // const [tabValue, setTabValue] = React.useState(0)
  const [addNew, setAddNew] = React.useState(false)

  Utility.analytics(
    'Webhook',
    // `${webhookCategory} Webhook Page`,
    // webhookCategory,
    true,
  )

  // const [tempFilters, setTempFilters] = React.useState(
  //   poracleFilters[webhookCategory],
  // )

  const footerButtons = React.useMemo(
    () => [
      {
        name: 'feedback',
        action: () => useLayoutStore.setState({ feedback: true }),
        icon: 'BugReport',
        disabled: !categories.length || !feedbackLink,
        color: 'success',
      },
      {
        name: addNew
          ? 'save'
          : category === 'human'
          ? t('manage_profiles')
          : t('add_new', { category: t(category) }),
        action: () => setAddNew(!addNew),
        key: 'addNew',
        icon: addNew ? 'Save' : 'Add',
        disabled: !categories.length,
      },
      {
        name: 'close',
        action: setMode,
        icon: 'Clear',
        color: 'primary',
      },
    ],
    [addNew, categories, feedbackLink],
  )

  const changeTab = React.useCallback(
    /** @param {React.SyntheticEvent<Element, Event>} _ @param {typeof category} newCategory */
    (_, newCategory) => {
      useWebhookStore.setState({ category: categories[newCategory] })
    },
    [categories],
  )

  const tabValue = categories.findIndex((x) => x === category)

  return (
    <>
      <Header
        names={[name]}
        action={setMode}
        titles={[addNew ? 'manage_profiles' : 'manage_webhook']}
      />
      <AppBar position="static" sx={{ display: addNew ? 'none' : 'block' }}>
        <Tabs value={tabValue} onChange={changeTab}>
          {categories.map((each) => (
            <Tab
              key={each}
              icon={<TabIcon key={each} category={each} />}
              style={{ minWidth: 5 }}
            />
          ))}
        </Tabs>
      </AppBar>
      <DialogContent sx={{ p: 0 }}>
        <Collapse in={!addNew} sx={{ maxHeight: '70vh', overflow: 'auto' }}>
          <Box>
            {categories.map((key, i) => (
              <TabPanel value={tabValue} index={i} key={key} virtual>
                {key === 'human' ? <Human /> : <Tracked category={key} />}
              </TabPanel>
            ))}
          </Box>
        </Collapse>
        <Collapse in={addNew}>
          {category === 'human' ? (
            <ProfileEditing />
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
        </Collapse>
      </DialogContent>

      <Footer options={footerButtons} role="webhook_footer" />
    </>
  )
}

/** @param {{ category: import('./store').WebhookStore['category'] }} props */
function TabIcon({ category }) {
  const Icons = useStatic((s) => s.Icons)
  return category === 'human' ? (
    <Person />
  ) : (
    <img
      src={Icons.getMisc(category)}
      style={{ maxWidth: 20, height: 'auto' }}
      alt={category}
    />
  )
}

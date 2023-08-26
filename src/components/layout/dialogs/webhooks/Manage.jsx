// @ts-check
import * as React from 'react'
import Person from '@mui/icons-material/Person'
import DialogContent from '@mui/material/DialogContent'
import AppBar from '@mui/material/AppBar'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Collapse from '@mui/material/Collapse'

import Box from '@mui/material/Box'
import { useTranslation } from 'react-i18next'

import { useLayoutStore, useStatic } from '@hooks/useStore'
import Poracle from '@services/Poracle'
import Utility from '@services/Utility'
import Footer from '@components/layout/general/Footer'
import Header from '@components/layout/general/Header'
import { apolloClient } from '@services/apollo'
import Query from '@services/Query'
import { allProfiles } from '@services/queries/webhook'

import NewPokemon from './tiles/WebhookTile'
import Human from './human'
import Tracked from './Tracked'
import Menu from '../../general/Menu'
// import WebhookError from './Error'
import { setMode, setSelected, useWebhookStore } from './store'
import { useGenFullFilters, useGetHookContext } from './hooks'
import ProfileEditing from './human/profile'

export default function Manage() {
  const { t } = useTranslation()

  const categories = useGetHookContext()
  const category = useWebhookStore((s) => s.category)
  const name = useWebhookStore((s) => s.context.name) || ''

  const feedbackLink = useStatic((s) => s.config.map.feedbackLink)

  const filters = useGenFullFilters()

  const [addNew, setAddNew] = React.useState(false)
  const [tempFilters, setTempFilters] = React.useState(filters[category])
  const [height, setHeight] = React.useState(0)

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
    [addNew, categories, category, feedbackLink],
  )

  React.useEffect(() => {
    Utility.analytics('Webhook', `${category} Webhook Page`, category, true)
    setTempFilters(filters[category])
    setSelected()()
  }, [category])

  React.useEffect(() => {
    if (!addNew && category !== 'human') {
      const values = Poracle.processor(
        category,
        Object.values(tempFilters || {}).filter((x) => x && x.enabled),
        useWebhookStore.getState().context.ui[category].defaults,
      )
      setTempFilters(filters[category])
      apolloClient.mutate({
        mutation: Query.webhook(category),
        variables: {
          category,
          data: values,
          status: 'POST',
        },
        refetchQueries: [allProfiles],
      })
      useWebhookStore.setState((prev) => ({
        [category]: [...prev[category], ...values],
      }))
    }
  }, [addNew])

  const changeTab = React.useCallback(
    /** @param {React.SyntheticEvent<Element, Event>} _ @param {typeof category} newCategory */
    (_, newCategory) => {
      useWebhookStore.setState({ category: categories[newCategory] })
    },
    [categories],
  )

  const tabValue = categories.findIndex((x) => x === category)

  return category !== 'human' && addNew ? (
    <Menu
      category={Poracle.getMapCategory(category)}
      categories={Poracle.getFilterCategories(category)}
      webhookCategory={category}
      filters={filters[category]}
      tempFilters={tempFilters}
      setTempFilters={setTempFilters}
      title="webhook_selection"
      titleAction={() => setAddNew(false)}
      Tile={NewPokemon}
      extraButtons={[
        {
          name: 'save',
          action: () => setAddNew(false),
          icon: 'Save',
          color: 'secondary',
        },
      ]}
    />
  ) : (
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
      <DialogContent
        sx={{ p: 0 }}
        ref={(ref) => {
          if (ref instanceof HTMLElement && ref.clientHeight !== 0) {
            setHeight(ref.clientHeight)
          }
        }}
      >
        <Collapse
          in={!addNew}
          sx={{
            height: '70vh',
            p: 2,
          }}
        >
          {categories.map((key) => (
            <Box
              key={key}
              role="tabpanel"
              hidden={category !== key}
              height={height - 76}
            >
              {key === 'human' ? (
                <Human />
              ) : (
                <Tracked key={key} category={key} />
              )}
            </Box>
          ))}
        </Collapse>
        <Collapse in={addNew}>
          {category === 'human' && <ProfileEditing />}
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

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
import { WebhookItem } from '@components/layout/drawer/SelectorItem'

import Human from './human'
import Tracked from './Tracked'
import Menu from '../../general/Menu'
import { setMode, setSelected, useWebhookStore } from './store'
import { useGenFullFilters, useGetHookContext } from './hooks'
import ProfileEditing from './human/profile'

export default function Manage() {
  const { t } = useTranslation()

  const categories = useGetHookContext()
  const category = useWebhookStore((s) => s.category)
  const name = useWebhookStore((s) => s.context.name || '')

  const feedbackLink = useStatic((s) => s.config.links.feedbackLink)

  const filters = useGenFullFilters()

  /** @type {ReturnType<typeof React.useRef<HTMLElement | null>>} */
  const dialogRef = React.useRef(null)
  const [addNew, setAddNew] = React.useState(false)
  const [height, setHeight] = React.useState(0)

  const footerButtons = React.useMemo(() => {
    /** @type {import('@components/layout/general/Footer').FooterButton[]} */
    const buttons = [
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
        action: () => setAddNew((prev) => !prev),
        key: 'addNew',
        icon: addNew ? 'Save' : 'Add',
        disabled: !categories.length,
        color: 'secondary',
      },
    ]
    if (!addNew) {
      buttons.push({
        name: 'close',
        action: setMode,
        icon: 'Clear',
        disabled: false,
        color: 'primary',
      })
    }
    return buttons
  }, [addNew, categories, category, feedbackLink])

  React.useEffect(() => {
    Utility.analytics('Webhook', `${category} Webhook Page`, category, true)
    useWebhookStore.setState({ tempFilters: { ...filters[category] } })
    setSelected()()
    if (dialogRef.current && !addNew) {
      setHeight(dialogRef.current.clientHeight)
    }
  }, [category])

  React.useEffect(() => {
    if (!addNew && category !== 'human') {
      const { tempFilters } = useWebhookStore.getState()
      console.log({ tempFilters })
      const values = Poracle.processor(
        category,
        Object.values(tempFilters || {}).filter((x) => x && x.enabled),
        useWebhookStore.getState().context.ui[category].defaults,
      )
      console.log({ values })
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
        tempFilters: { ...filters[category] },
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
      tempFilters={filters[category]}
      category={Poracle.getMapCategory(category)}
      categories={Poracle.getFilterCategories(category)}
      webhookCategory={category}
      title="webhook_selection"
      titleAction={() => setAddNew(false)}
      extraButtons={[
        {
          name: 'save',
          action: () => setAddNew(false),
          icon: 'Save',
          color: 'secondary',
        },
      ]}
    >
      {(_, key) => <WebhookItem id={key} category={category} caption />}
    </Menu>
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
      <DialogContent sx={{ p: 0, minHeight: '70vh' }} ref={dialogRef}>
        <Collapse in={!addNew}>
          {category !== 'human' && (
            <Box role="tabpanel" height={height - 76} p={2}>
              <Tracked category={category} />
            </Box>
          )}
          <Box
            role="tabpanel"
            height={height - 76}
            p={4}
            hidden={category !== 'human'}
          >
            <Human />
          </Box>
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

import * as React from 'react'
import Person from '@mui/icons-material/Person'
import DialogContent from '@mui/material/DialogContent'
import AppBar from '@mui/material/AppBar'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Collapse from '@mui/material/Collapse'
import Box from '@mui/material/Box'
import { useTranslation } from 'react-i18next'
import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { Footer } from '@components/dialogs/Footer'
import { Header } from '@components/dialogs/Header'
import { apolloClient } from '@services/apollo'
import { Query } from '@services/queries'
import { ALL_PROFILES } from '@services/queries/webhook'
import { Menu } from '@components/Menu'
import { setMode, setSelected, useWebhookStore } from '@store/useWebhookStore'
import { analytics } from '@utils/analytics'

import { Human } from './human'
import { Tracked } from './Tracked'
import { useGenFilters } from './hooks/useGenFilters'
import { useGetHookContext } from './hooks/useGetHookContext'
import { ProfileEditing } from './human/profile'
import { Poracle } from './services/Poracle'
import { WebhookItem } from './tiles/WebhookItem'

export function Manage() {
  const { t } = useTranslation()

  const categories = useGetHookContext()
  const category = useWebhookStore((s) => s.category)
  const name = useWebhookStore((s) => s.context.name || '')

  const feedbackLink = useMemory((s) => s.config.links.feedbackLink)

  const filters = useGenFilters()

  const dialogRef: ReturnType<typeof React.useRef<HTMLElement | null>> =
    React.useRef(null)
  const [addNew, setAddNew] = React.useState({ open: false, save: false })
  const [height, setHeight] = React.useState(0)

  const footerButtons = React.useMemo(() => {
    const buttons: import('@components/dialogs/Footer').FooterButton[] = [
      {
        name: 'feedback',
        action: () => useLayoutStore.setState({ feedback: true }),
        icon: 'BugReport',
        disabled: !categories.length || !feedbackLink,
        color: 'success',
      },
      {
        name: addNew.open
          ? 'save'
          : category === 'human'
            ? t('manage_profiles')
            : t('add_new', { category: t(category) }),
        action: () => setAddNew((prev) => ({ open: !prev.open, save: false })),
        key: 'addNew',
        icon: addNew.open ? 'Save' : 'Add',
        disabled: !categories.length,
        color: 'secondary',
      },
    ]

    if (!addNew.open) {
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
    analytics('Webhook', `${category} Webhook Page`, category, true)
    useWebhookStore.setState({ tempFilters: { ...filters[category] } })
    setSelected()()
    if (dialogRef.current && !addNew.open) {
      setHeight(dialogRef.current.clientHeight)
    }
  }, [category])

  React.useEffect(() => {
    if (!addNew.open && addNew.save && category !== 'human') {
      const { tempFilters } = useWebhookStore.getState()
      const values = Poracle.processor(
        category,
        Object.values(tempFilters || {}).filter((x) => x && x.enabled),
        useWebhookStore.getState().context.ui[category].defaults,
      )

      apolloClient.mutate({
        // @ts-ignore
        mutation: Query.webhook(category.toUpperCase()),
        variables: {
          category,
          data: values,
          status: 'POST',
        },
        refetchQueries: [ALL_PROFILES],
      })
      useWebhookStore.setState((prev) => ({
        [category]: [...prev[category], ...values],
        tempFilters: { ...filters[category] },
      }))
    }
  }, [addNew])

  const changeTab = React.useCallback(
    /** @param {React.SyntheticEvent<Element, Event>} _ @param {typeof category} newCategory */
    (_: React.SyntheticEvent<Element, Event>, newCategory: typeof category) => {
      useWebhookStore.setState({ category: categories[newCategory] })
    },
    [categories],
  )

  const tabValue = categories.findIndex((x) => x === category)

  const buttons: import('@components/dialogs/Footer').FooterButton[] =
    React.useMemo(
      () => [
        {
          name: 'save',
          action: () => setAddNew({ open: false, save: true }),
          icon: 'Save',
          color: 'secondary',
        },
      ],
      [setAddNew],
    )

  return category !== 'human' && addNew.open ? (
    <>
      <Header
        action={() => setAddNew({ open: false, save: false })}
        names={[category]}
        titles="webhook_selection"
      />
      <Menu
        categories={Poracle.getFilterCategories(category)}
        category={Poracle.getMapCategory(category)}
        extraButtons={buttons}
        webhookCategory={category}
      >
        {(_, key) => <WebhookItem caption category={category} id={key} />}
      </Menu>
    </>
  ) : (
    <>
      <Header
        action={setMode}
        names={[name]}
        titles={[addNew.open ? 'manage_profiles' : 'manage_webhook']}
      />
      <AppBar
        position="static"
        sx={{ display: addNew.open ? 'none' : 'block' }}
      >
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
      <DialogContent ref={dialogRef} sx={{ p: 0, minHeight: '70vh' }}>
        <Collapse in={!addNew.open}>
          {category !== 'human' && (
            <Box height={height - 76} p={2} role="tabpanel">
              <Tracked category={category} />
            </Box>
          )}
          <Box
            height={height - 76}
            hidden={category !== 'human'}
            p={4}
            role="tabpanel"
          >
            <Human />
          </Box>
        </Collapse>
        <Collapse in={addNew.open}>
          {category === 'human' && <ProfileEditing />}
        </Collapse>
      </DialogContent>
      <Footer i18nKey="webhook_footer" options={footerButtons} />
    </>
  )
}

/** @param {{ category: import('@store/useWebhookStore').WebhookStore['category'] }} props */
function TabIcon({
  category,
}: {
  category: import('@store/useWebhookStore').WebhookStore['category']
}) {
  const Icons = useMemory((s) => s.Icons)

  return category === 'human' ? (
    <Person />
  ) : (
    <img
      alt={category}
      src={Icons.getMisc(category)}
      style={{ maxWidth: 20, height: 'auto' }}
    />
  )
}

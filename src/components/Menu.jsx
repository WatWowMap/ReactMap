// @ts-check

import { Footer } from '@components/dialogs/Footer'
import { useAnalytics } from '@hooks/useAnalytics'
import { useFilter } from '@hooks/useFilter'
import { useGetAvailable } from '@hooks/useGetAvailable'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { useLayoutStore } from '@store/useLayoutStore'
import { useMemory } from '@store/useMemory'
import { applyToAllWebhooks, useWebhookStore } from '@store/useWebhookStore'
import { applyToAll } from '@utils/applyToAll'
import { getAmbiguousForms } from '@utils/getAmbiguousForms'
import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { OptionsContainer } from './filters/OptionsContainer'
import { GenericSearch } from './inputs/GenericSearch'
import { VirtualGrid } from './virtual/VirtualGrid'

/**
 * @template {import('@rm/types').AdvCategories} T
 * @param {{
 *  category: T
 *  webhookCategory?: string
 *  children: (index: number, key: string) => React.ReactNode
 *  categories?: (keyof import('@rm/types').Available)[]
 *  extraButtons?: import('@components/dialogs/Footer').FooterButton[]
 * }} props
 */
export function Menu({
  category,
  webhookCategory,
  children,
  categories,
  extraButtons,
}) {
  useGetAvailable(category)
  useAnalytics(`/advanced/${category}`)
  const isMobile = useMemory((s) => s.isMobile)
  const { t } = useTranslation()

  const [filterDrawer, setFilterDrawer] = React.useState(false)

  const footerButtons = React.useMemo(
    () =>
      /** @type {import('@components/dialogs/Footer').FooterButton[]} */ ([
        {
          name: 'help',
          action: () =>
            useLayoutStore.setState({ help: { open: true, category } }),
          icon: 'HelpOutline',
        },
        {
          name: '',
          disabled: true,
        },
        {
          name: 'apply_to_all',
          action: () =>
            (webhookCategory ? useWebhookStore : useLayoutStore).setState({
              [webhookCategory ? 'advanced' : 'advancedFilter']: {
                open: true,
                id: 'global',
                category: webhookCategory || category,
                selectedIds: useMemory.getState().advMenuFiltered[category],
              },
            }),
          icon:
            category === 'pokemon' || webhookCategory ? 'Tune' : 'FormatSize',
        },
        {
          name: 'disable_all',
          action: () =>
            webhookCategory
              ? applyToAllWebhooks(
                  false,
                  useMemory.getState().advMenuFiltered[category],
                )
              : applyToAll(
                  { enabled: false },
                  category,
                  useMemory.getState().advMenuFiltered[category],
                  false,
                ),
          icon: 'Clear',
          color: 'error',
        },
        {
          name: 'enable_all',
          action: () =>
            webhookCategory
              ? applyToAllWebhooks(
                  true,
                  useMemory.getState().advMenuFiltered[category],
                )
              : applyToAll(
                  { enabled: true },
                  category,
                  useMemory.getState().advMenuFiltered[category],
                  !webhookCategory,
                ),
          icon: 'Check',
          color: 'success',
        },
        ...(extraButtons ?? []),
      ]),
    [category, webhookCategory, extraButtons],
  )

  return (
    <>
      <DialogContent className="container" sx={{ p: 0, minHeight: '75vh' }}>
        {!isMobile && (
          <Box className="column-25">
            <OptionsContainer category={category} categories={categories} />
          </Box>
        )}
        <Box p={1} className="column-75">
          <Box pb={1} display="flex">
            <GenericSearch
              field={`searches.${category}Advanced`}
              label={t(`search_${category}`, t(`search_${category}s`))}
            />
            {isMobile && (
              <IconButton onClick={() => setFilterDrawer((prev) => !prev)}>
                <ExpandMoreIcon
                  className={filterDrawer ? 'expanded' : 'closed'}
                />
              </IconButton>
            )}
          </Box>
          <Box>
            {isMobile && (
              <Collapse in={filterDrawer}>
                <OptionsContainer category={category} categories={categories} />
              </Collapse>
            )}
            <Results
              category={category}
              webhookCategory={webhookCategory}
              categories={categories}
            >
              {children}
            </Results>
          </Box>
        </Box>
      </DialogContent>
      <Footer options={footerButtons} role="dialog_filter_footer" />
    </>
  )
}

function Results({ category, webhookCategory, categories, children }) {
  const { t, i18n } = useTranslation()
  const filteredArr = useFilter(category, webhookCategory, categories)
  const available = useMemory((s) => s.available[category])

  // available keeps the labels stable while the anomaly lasts, filteredArr
  // covers the menu options that render more than what's currently available
  const ambiguousForms = React.useMemo(
    () => getAmbiguousForms([...(available || []), ...filteredArr]),
    [available, filteredArr, i18n.language],
  )

  // not via VirtualGrid's context: that one gets spread onto the Grid2 items
  const itemContent = React.useCallback(
    (index, key) => children(index, key, ambiguousForms),
    [children, ambiguousForms],
  )

  return filteredArr.length ? (
    <VirtualGrid data={filteredArr} xs={4} md={2}>
      {itemContent}
    </VirtualGrid>
  ) : (
    <Box className="flex-center" flex="1 1 auto" whiteSpace="pre-line">
      <Typography variant="h6" align="center">
        {t('no_filter_results')}
      </Typography>
    </Box>
  )
}

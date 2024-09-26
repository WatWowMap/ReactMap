import * as React from 'react'
import Box from '@mui/material/Box'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'

import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { useFilter } from '@hooks/useFilter'
import { Footer, FooterButton } from '@components/dialogs/Footer'
import { applyToAll } from '@utils/applyToAll'
import { useGetAvailable } from '@hooks/useGetAvailable'
import { applyToAllWebhooks, useWebhookStore } from '@store/useWebhookStore'
import { useAnalytics } from '@hooks/useAnalytics'
import type { AdvCategories, Available } from '@rm/types'

import { OptionsContainer } from './filters/OptionsContainer'
import { VirtualGrid } from './virtual/VirtualGrid'
import { GenericSearch } from './inputs/GenericSearch'

interface Props<T extends AdvCategories> {
  category: T
  webhookCategory?: string
  children: (index: number, key: string) => React.ReactNode
  categories?: (keyof Available)[]
  extraButtons?: FooterButton[]
}

export function Menu<T extends AdvCategories>({
  category,
  webhookCategory,
  children,
  categories,
  extraButtons,
}: Props<T>) {
  useGetAvailable(category)
  useAnalytics(`/advanced/${category}`)
  const isMobile = useMemory((s) => s.isMobile)
  const { t } = useTranslation()

  const [filterDrawer, setFilterDrawer] = React.useState(false)

  const footerButtons: FooterButton[] = React.useMemo(
    () => [
      {
        name: 'help',
        action: () =>
          useLayoutStore.setState({ help: { open: true, category } }),
        icon: 'Help',
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
        icon: category === 'pokemon' || webhookCategory ? 'Tune' : 'FormatSize',
      },
      {
        name: 'disable_all',
        action: () =>
          webhookCategory
            ? applyToAllWebhooks(
                false,
                useMemory.getState().advMenuFiltered[category],
              )
            : applyToAll({
                newFilter: { enabled: false },
                category,
                selectedIds: useMemory.getState().advMenuFiltered[category],
              }),
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
            : applyToAll({
                newFilter: { enabled: true },
                category,
                selectedIds: useMemory.getState().advMenuFiltered[category],
                includeSlots: !webhookCategory,
              }),
        icon: 'Check',
        color: 'success',
      },
      ...(extraButtons ?? []),
    ],
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

function Results<T extends AdvCategories>({
  category,
  webhookCategory,
  categories,
  children,
}: Props<T>) {
  const { t } = useTranslation()
  const filteredArr = useFilter(category, webhookCategory, categories)
  return filteredArr.length ? (
    <VirtualGrid data={filteredArr} xs={4} md={2}>
      {children}
    </VirtualGrid>
  ) : (
    <Box className="flex-center" flex="1 1 auto" whiteSpace="pre-line">
      <Typography variant="h6" align="center">
        {t('no_filter_results')}
      </Typography>
    </Box>
  )
}

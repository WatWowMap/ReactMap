import type { AdvCategories, Available } from '@rm/types'

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
            : applyToAll(
                { enabled: false },
                category,
                useMemory.getState().advMenuFiltered[category],
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
    ],
    [category, webhookCategory, extraButtons],
  )

  return (
    <>
      <DialogContent className="container" sx={{ p: 0, minHeight: '75vh' }}>
        {!isMobile && (
          <Box className="column-25">
            <OptionsContainer categories={categories} category={category} />
          </Box>
        )}
        <Box className="column-75" p={1}>
          <Box display="flex" pb={1}>
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
                <OptionsContainer categories={categories} category={category} />
              </Collapse>
            )}
            <Results
              categories={categories}
              category={category}
              webhookCategory={webhookCategory}
            >
              {children}
            </Results>
          </Box>
        </Box>
      </DialogContent>
      <Footer i18nKey="dialog_filter_footer" options={footerButtons} />
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
    <VirtualGrid data={filteredArr} md={2} xs={4}>
      {children}
    </VirtualGrid>
  ) : (
    <Box className="flex-center" flex="1 1 auto" whiteSpace="pre-line">
      <Typography align="center" variant="h6">
        {t('no_filter_results')}
      </Typography>
    </Box>
  )
}

import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import Drawer from '@mui/material/Drawer'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import { useStore, useStatic, useLayoutStore } from '@hooks/useStore'
import useFilter from '@hooks/useFilter'
import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'
import { applyToAll } from '@services/filtering/applyToAll'

import OptionsContainer from '../dialogs/filters/OptionsContainer'
import Help from '../dialogs/tutorial/Advanced'
import { VirtualGrid } from './VirtualGrid'
import { GenericSearch } from '../drawer/ItemSearch'
import { useWebhookStore } from '../dialogs/webhooks/store'

/**
 * @param {{
 *  category: string
 *  webhookCategory?: string
 *  tempFilters: import('@rm/types').Filters
 *  children: (item: import('@rm/types').MenuItem, key: string) => React.ReactNode
 *  categories?: import('@rm/types').Available[]
 *  title: string
 *  titleAction: () => void
 *  extraButtons?: import('@components/layout/general/Footer').FooterButton[]
 * }} props
 */
export default function Menu({
  category,
  webhookCategory,
  tempFilters,
  children,
  categories,
  title,
  titleAction,
  extraButtons,
}) {
  Utility.analytics(`/advanced/${category}`)

  const isMobile = useStatic((s) => s.isMobile)
  const { t } = useTranslation()
  const menus = useStore((state) => state.menus)

  const [filterDrawer, setFilterDrawer] = useState(false)
  const [helpDialog, setHelpDialog] = useState(false)

  const { filteredObj, filteredArr, count } = useFilter(
    tempFilters,
    menus,
    category,
    webhookCategory,
    categories,
  )

  const toggleDrawer = React.useCallback(
    (open) => (event) => {
      if (
        event.type === 'keydown' &&
        (event.key === 'Tab' || event.key === 'Shift')
      ) {
        return
      }
      setFilterDrawer(open)
    },
    [],
  )

  const Options = React.useMemo(
    () => (
      <OptionsContainer
        countTotal={count.total}
        countShow={count.show}
        category={category}
        toggleDrawer={toggleDrawer}
        categories={categories}
      />
    ),
    [category, categories, count.total, count.show, toggleDrawer],
  )

  const footerButtons = React.useMemo(() => {
    const selectedIds = Object.keys(filteredObj)
    return [
      {
        name: 'help',
        action: () => setHelpDialog((prev) => !prev),
        icon: 'HelpOutline',
      },
      {
        name: 'openFilter',
        action: toggleDrawer(true),
        icon: 'Ballot',
        mobileOnly: true,
      },
      {
        name: 'apply_to_all',
        action: () =>
          (webhookCategory ? useWebhookStore : useLayoutStore).setState({
            advancedFilter: {
              open: true,
              id: 'global',
              category,
              selectedIds,
            },
          }),
        icon: category === 'pokemon' || webhookCategory ? 'Tune' : 'FormatSize',
      },
      {
        name: 'disable_all',
        action: () =>
          applyToAll(false, category, selectedIds, !webhookCategory),
        icon: 'Clear',
        color: 'error',
      },
      {
        name: 'enable_all',
        action: () => applyToAll(true, category, selectedIds, !webhookCategory),
        icon: 'Check',
        color: 'success',
      },
      ...(extraButtons ?? []),
    ]
  }, [category, webhookCategory, extraButtons, filteredObj, tempFilters])

  return (
    <>
      <Header
        titles={title}
        action={titleAction}
        names={[webhookCategory || category]}
      />
      <DialogContent className="container" sx={{ p: 0, minHeight: '75vh' }}>
        {!isMobile && <Box className="column-25">{Options}</Box>}
        <Box p={1} className="column-75">
          <Box pb={1}>
            <GenericSearch
              field={`searches.${category}Advanced`}
              label={t(`search_${category}`, t(`search_${category}s`))}
            />
          </Box>
          {filteredArr.length ? (
            <VirtualGrid data={filteredArr} xs={4} md={2}>
              {children}
            </VirtualGrid>
          ) : (
            <Box className="flex-center" flex="1 1 auto" whiteSpace="pre-line">
              <Typography variant="h6" align="center">
                {t('no_filter_results')}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <Footer options={footerButtons} role="dialog_filter_footer" />
      {!isMobile && (
        <Drawer
          anchor="bottom"
          sx={{ zIndex: 10000 }}
          open={filterDrawer}
          onClose={toggleDrawer(false)}
        >
          {Options}
        </Drawer>
      )}
      <Dialog open={helpDialog} onClose={() => setHelpDialog(false)}>
        <Help
          toggleHelp={() => setHelpDialog(!helpDialog)}
          category={category}
          isMobile={isMobile}
        />
      </Dialog>
    </>
  )
}

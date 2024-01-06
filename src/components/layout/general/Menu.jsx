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

import SlotSelection from '../dialogs/filters/SlotSelection'
import OptionsContainer from '../dialogs/filters/OptionsContainer'
import Help from '../dialogs/tutorial/Advanced'
import WebhookAdvanced from '../dialogs/webhooks/WebhookAdv'
import { VirtualGrid } from './VirtualGrid'
import { SelectorItem } from '../drawer/SelectorItem'
import { GenericSearch } from '../drawer/ItemSearch'

export default function Menu({
  category,
  webhookCategory,
  tempFilters,
  setTempFilters,
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
  const [slotsMenu, setSlotsMenu] = useState({
    open: false,
    id: 0,
  })
  const [helpDialog, setHelpDialog] = useState(false)
  const [webhook, setWebhook] = useState({
    open: false,
    id: '',
  })

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

  const toggleWebhook = (open, id, newFilters) => (event) => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return
    }
    if (id === 'global' && !open && newFilters) {
      const wildCards = (() => {
        switch (webhookCategory) {
          case 'raid':
            return ['r90']
          case 'egg':
            return ['e90']
          case 'gym':
            return ['t4']
          case 'invasion':
            return ['i0']
          default:
            return ['0-0']
        }
      })()
      if (newFilters.everything_individually !== false) {
        Object.keys(filteredObj).forEach((item) => {
          if (!wildCards.includes(item)) {
            filteredObj[item] = {
              ...tempFilters[item],
              ...newFilters,
              enabled: true,
            }
          }
        })
      } else {
        wildCards.forEach((item) => {
          filteredObj[item] = {
            ...tempFilters[item],
            ...newFilters,
            enabled: true,
          }
        })
      }
      setTempFilters({ ...tempFilters, ...filteredObj, [id]: newFilters })
    } else if (id && newFilters && !open) {
      setTempFilters({
        ...tempFilters,
        [id]: { ...tempFilters[id], ...newFilters, enabled: true },
      })
    }
    setWebhook({ open, id: id ?? '' })
  }

  const toggleSlotsMenu = (open, id, newFilters) => (event) => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return
    }
    if (open) {
      setSlotsMenu({
        open,
        id,
      })
    } else if (newFilters) {
      setSlotsMenu({ open })
      setTempFilters({ ...newFilters })
    } else {
      setSlotsMenu({ open })
    }
  }

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
        action: webhookCategory
          ? toggleWebhook(true, 'global')
          : () =>
              useLayoutStore.setState({
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
              {(_, key) => (
                <SelectorItem id={key} category={category} caption />
              )}
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
      <Dialog open={slotsMenu.open} onClose={toggleSlotsMenu(false)}>
        <SlotSelection
          teamId={slotsMenu.id}
          toggleSlotsMenu={toggleSlotsMenu}
          tempFilters={tempFilters}
          isMobile={isMobile}
        />
      </Dialog>
      <Dialog open={helpDialog} onClose={() => setHelpDialog(false)}>
        <Help
          toggleHelp={() => setHelpDialog(!helpDialog)}
          category={category}
          isMobile={isMobile}
        />
      </Dialog>
      <Dialog
        open={!!(webhook.open && webhook.id)}
        fullWidth={!isMobile}
        fullScreen={isMobile}
        onClose={toggleWebhook(false)}
      >
        <WebhookAdvanced
          id={webhook.id}
          category={webhookCategory}
          isMobile={isMobile}
          toggleWebhook={toggleWebhook}
          tempFilters={tempFilters[webhook.id]}
        />
      </Dialog>
    </>
  )
}

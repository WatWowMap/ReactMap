import * as React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import { useTranslation } from 'react-i18next'
import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { useDeepStore, useStorage } from '@store/useStorage'
import { Header } from '@components/dialogs/Header'
import { Footer } from '@components/dialogs/Footer'
import { BoolToggle, DualBoolToggle } from '@components/inputs/BoolToggle'
import { ENABLED_ALL, XXS_XXL } from '@assets/constants'
import { useTranslateById } from '@hooks/useTranslateById'
import { STANDARD_BACKUP, applyToAll } from '@utils/applyToAll'
import { checkIfHasAll } from '@utils/hasAll'
import { useAnalytics } from '@hooks/useAnalytics'

import { SliderTile } from '../inputs/SliderTile'

import { StringFilter } from './StringFilter'
import { Size } from './Size'
import { GenderListItem } from './Gender'
import { QuestConditionSelector } from './QuestConditions'

export function AdvancedFilter() {
  const { category, id, selectedIds, open } = useLayoutStore(
    (s) => s.advancedFilter,
  )
  const { t } = useTranslation()
  const { t: tId } = useTranslateById()
  const ui = useMemory((s) => s.ui[category])
  const isMobile = useMemory((s) => s.isMobile)
  const legacyFilter = useStorage(
    (s) => !!s.userSettings[category]?.legacyFilter,
  )
  const standard = useMemory((s) =>
    category === 'pokemon'
      ? s.filters[category]?.standard || STANDARD_BACKUP
      : STANDARD_BACKUP,
  )
  const easyMode = useStorage((s) => !!s.filters?.[category]?.easyMode)
  const [filters, setFilters] = useDeepStore(
    category ? `filters.${category}.filter.${id}` : `filters.gyms.standard`,
    standard,
  )
  const backup = React.useRef(filters)

  useAnalytics(`/${category}/${id}`)
  useAnalytics(
    'Advanced Filtering',
    `ID: ${id} Size: ${filters?.size || 'md'}`,
    category,
  )

  const handleChange = React.useCallback(
    function <T extends keyof typeof filters>(
      key: T,
      values: (typeof filters)[T],
    ) {
      setFilters((prev) => ({
        ...prev,
        [key]: values,
        enabled: prev.enabled || (key !== 'enabled' && !filters.enabled),
      }))
    },
    [setFilters],
  )

  const toggleClose = (save = false) => {
    useLayoutStore.setState((prev) => ({
      advancedFilter: { ...prev.advancedFilter, open: false, id: '' },
    }))
    if (!save) {
      setFilters({ ...backup.current })
    } else if (id === 'global' && selectedIds?.length && category) {
      applyToAll(filters, category, selectedIds, false)
    }
  }

  const footerOptions: import('@components/dialogs/Footer').FooterButton[] =
    React.useMemo(
      () => [
        {
          name: 'reset',
          action: () => setFilters({ ...standard }),
          color: 'primary',
        },
        {
          name: 'close',
          action: () => toggleClose(true),
          color: 'secondary',
        },
      ],
      [standard, filters, setFilters],
    )

  const handleAllEnabled: import('@mui/material').SwitchProps['onChange'] =
    React.useCallback(
      ({ target }, checked) => {
        if (target.name === 'all' && checked && !filters.enabled) {
          setFilters('enabled', true)
        }
      },
      [setFilters],
    )

  React.useLayoutEffect(() => {
    if (open) backup.current = filters
  }, [open])

  if (!id || !category) return null
  const showMoreFilters = category === 'pokemon' && !easyMode

  return (
    <Dialog
      fullScreen={isMobile && category === 'pokemon'}
      open={!!open}
      onClose={() => toggleClose(false)}
    >
      <Header
        action={() => toggleClose(false)}
        titles={`${
          category === 'pokemon' || (!id.startsWith('l') && !id.startsWith('i'))
            ? t('advanced')
            : t('set_size')
        } - ${tId(id)}`}
      />
      <DialogContent sx={{ mt: 3 }}>
        <List>
          {legacyFilter && 'legacy' in ui ? (
            <StringFilter field={`filters.${category}.filter.${id}`} />
          ) : (
            <Grid2 container disableGutters disablePadding component={ListItem}>
              {Object.entries(
                'sliders' in ui && !easyMode ? ui.sliders : {},
              ).map(([subCat, sliders], i) => (
                <Grid2 key={subCat} component={List} sm={6} xs={12}>
                  {sliders.map((each) => (
                    <ListItem
                      key={`${subCat}${each.name}`}
                      disableGutters
                      disablePadding
                      sx={{ pr: { xs: 0, sm: i ? 0 : 2 } }}
                    >
                      <SliderTile
                        handleChange={handleChange}
                        slide={{
                          ...each,
                          disabled: each.disabled || filters.all,
                        }}
                        values={filters[each.name]}
                      />
                    </ListItem>
                  ))}
                </Grid2>
              ))}
              <Grid2 component={List} sm={showMoreFilters ? 6 : 12} xs={12}>
                {showMoreFilters && (
                  <GenderListItem
                    disableGutters
                    disabled={filters.all}
                    field={`filters.${category}.filter.${id}`}
                  />
                )}
                <Size
                  disableGutters
                  field={`filters.${category}.filter.${id}`}
                />
              </Grid2>
              <Grid2 component={List} sm={showMoreFilters ? 6 : 12} xs={12}>
                {showMoreFilters && (
                  <DualBoolToggle
                    disabled={filters.all}
                    field={`filters.${category}.filter.${id}`}
                    items={XXS_XXL}
                    label="size_1-size_5"
                  />
                )}
                {category === 'pokestops' && <QuestConditionSelector id={id} />}
                {checkIfHasAll(category, id) ? (
                  <DualBoolToggle
                    field={`filters.${category}.filter.${id}`}
                    items={ENABLED_ALL}
                    secondColor="success"
                    switchColor="secondary"
                    onChange={handleAllEnabled}
                  />
                ) : (
                  <BoolToggle
                    disableGutters
                    field={`filters.${category}.filter.${id}.enabled`}
                  />
                )}
              </Grid2>
            </Grid2>
          )}
        </List>
      </DialogContent>
      <Footer options={footerOptions} />
    </Dialog>
  )
}

// @ts-check
import * as React from 'react'
import { DialogContent, List, ListItem, Dialog } from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import { useStore, useStatic, useDeepStore } from '@hooks/useStore'
import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'
import { DualBoolToggle } from '@components/layout/drawer/BoolToggle'
import { ADVANCED_ALL, FILTER_SIZES } from '@assets/constants'

import { StringFilter } from './StringFilter'
import SliderTile from './SliderTile'
import Size from './Size'
import { GenderListItem } from './Gender'
import { QuestConditionSelector } from './QuestConditions'

const STANDARD_BACKUP = /** @type {import('@rm/types/lib').BaseFilter} */ ({
  enabled: false,
  size: 'md',
  all: false,
  adv: '',
})

/**
 *
 * @param {{
 *  id: string,
 *  category: 'pokemon' | 'gyms' | 'pokestops' | 'nests',
 *  open: boolean,
 *  setOpen: (open: boolean) => void
 *  selectedIds?: string[]
 * }} props
 * @returns
 */
export default function AdvancedFilter({
  id,
  category,
  open,
  setOpen,
  selectedIds,
}) {
  Utility.analytics(`/${category}/${id}`)
  const { t } = useTranslation()

  const ui = useStatic((s) => s.ui[category])
  const isMobile = useStatic((s) => s.isMobile)

  const legacyFilter = useStore(
    (s) => s.userSettings[category]?.legacyFilter || false,
  )
  const [filters, setFilters] = useDeepStore(`filters.${category}.filter.${id}`)
  const standard = useStore((s) =>
    category === 'pokemon' ? s.filters[category].standard : STANDARD_BACKUP,
  )

  Utility.analytics(
    'Advanced Filtering',
    `ID: ${id} Size: ${filters.size}`,
    category,
  )

  /**
   * @template {keyof typeof filters} T
   * @param {T} key
   * @param {(typeof filters)[T]} values
   * @returns
   */
  const handleChange = (key, values) => setFilters(key, values)

  const toggleClose =
    (save = false) =>
    () => {
      setOpen(!open)
      if (!save) {
        setFilters({ ...standard })
      } else if (id === 'global' && selectedIds?.length) {
        const keys = new Set(selectedIds)
        useStore.setState((prev) => ({
          filters: {
            ...prev.filters,
            [category]: {
              ...prev.filters[category],
              filter: Object.fromEntries(
                Object.entries(prev.filters[category].filter).map(
                  ([key, oldFilter]) => [
                    key,
                    keys.has(key)
                      ? {
                          ...filters,
                          enabled: true,
                          all: prev.filters[category].easyMode,
                        }
                      : oldFilter,
                  ],
                ),
              ),
            },
          },
        }))
      }
    }

  const footerOptions =
    /** @type {import('@components/layout/general/Footer').FooterButton[]} */ (
      React.useMemo(
        () => [
          {
            name: 'reset',
            action: () => setFilters({ ...standard }),
            color: 'primary',
            size: category === 'pokemon' ? 2 : null,
          },
          {
            name: 'save',
            action: () => toggleClose(true)(),
            color: 'secondary',
            size: category === 'pokemon' ? 3 : null,
          },
        ],
        [category, filters, id],
      )
    )

  if (!id) return null
  return (
    <Dialog open={open} onClose={toggleClose(false)} fullScreen={isMobile}>
      <Header
        titles={[
          category === 'pokemon' || (!id.startsWith('l') && !id.startsWith('i'))
            ? t('advanced')
            : t('set_size'),
        ]}
        action={toggleClose(false)}
      />
      <DialogContent sx={{ mt: 3 }}>
        <List>
          {category === 'pokemon' ? (
            legacyFilter && 'legacy' in ui ? (
              <StringFilter field={`filters.${category}.filter.${id}`} />
            ) : (
              <>
                <Grid2
                  container
                  component={ListItem}
                  disableGutters
                  disablePadding
                >
                  {Object.entries('sliders' in ui ? ui.sliders : {}).map(
                    ([subCat, sliders], i) => (
                      <Grid2 key={subCat} component={List} xs={12} sm={6}>
                        {sliders.map((each) => (
                          <ListItem
                            key={`${subCat}${each.name}`}
                            disableGutters
                            disablePadding
                            sx={{ pr: { xs: 0, sm: i ? 0 : 2 } }}
                          >
                            <SliderTile
                              slide={{
                                ...each,
                                disabled: each.disabled || filters.all,
                              }}
                              // @ts-ignore
                              handleChange={handleChange}
                              values={filters[each.name]}
                            />
                          </ListItem>
                        ))}
                      </Grid2>
                    ),
                  )}
                </Grid2>
                <Grid2
                  container
                  component={ListItem}
                  disableGutters
                  disablePadding
                >
                  <Grid2 component={List} xs={12} sm={6}>
                    <GenderListItem
                      field={`filters.${category}.filter.${id}`}
                      disabled={filters.all}
                      disableGutters
                    />
                    <Size
                      field={`filters.${category}.filter.${id}`}
                      disableGutters
                    />
                  </Grid2>
                  <Grid2 component={List} xs={12} sm={6}>
                    <DualBoolToggle
                      items={FILTER_SIZES}
                      field={`filters.${category}.filter.${id}`}
                      disabled={filters.all}
                    />
                    <DualBoolToggle
                      items={ADVANCED_ALL}
                      field={`filters.${category}.filter.${id}`}
                      switchColor="success"
                    />
                  </Grid2>
                </Grid2>
              </>
            )
          ) : (
            <Size
              field={`filters.${category}.filter.${id}`}
              disabled={filters.all}
            />
          )}
          {category === 'pokestops' && <QuestConditionSelector id={id} />}
        </List>
      </DialogContent>
      <Footer options={footerOptions} />
    </Dialog>
  )
}

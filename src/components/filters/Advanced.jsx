// @ts-check
import * as React from 'react'
import Box from '@mui/material/Box'
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
import { useHasShinyPlayers } from '@hooks/usePersonalShiny'

import { StringFilter } from './StringFilter'
import { SliderTile } from '../inputs/SliderTile'
import { Size } from './Size'
import { GenderListItem } from './Gender'
import { QuestConditionSelector } from './QuestConditions'
import { PersonalShinyFilter } from './PersonalShiny'

// the only shiny toggle fills the left half of a row of two
const SHINY_ONLY = /** @type {const} */ (['personal_shiny_only', ''])

export function AdvancedFilter() {
  const { category, id, selectedIds, open, showDefaultForms } = useLayoutStore(
    (s) => s.advancedFilter,
  )
  const { t } = useTranslation()
  const { t: tId } = useTranslateById()
  const ui = useMemory((s) => s.ui[category])
  const isMobile = useMemory((s) => s.isMobile)
  const legacyFilter = useStorage(
    (s) => !!s.userSettings[category]?.legacyFilter,
  )
  const defaultFilter = useMemory((s) => {
    if (!category) return STANDARD_BACKUP
    return category === 'pokemon'
      ? s.filters[category]?.standard || STANDARD_BACKUP
      : s.filters[category]?.filter?.[id] || STANDARD_BACKUP
  })
  const easyMode = useStorage((s) => !!s.filters?.[category]?.easyMode)
  const hasShinyPlayers = useHasShinyPlayers()
  const personalShiny =
    useMemory((s) => !!s.ui.pokemon?.personalShiny) && hasShinyPlayers
  const [filters, setFilters] = useDeepStore(
    category ? `filters.${category}.filter.${id}` : `filters.gyms.standard`,
    defaultFilter,
  )
  const backup = React.useRef(filters)

  useAnalytics(`/${category}/${id}`)
  useAnalytics(
    'Advanced Filtering',
    `ID: ${id} Size: ${filters?.size || 'md'}`,
    category,
  )

  const handleChange = React.useCallback(
    /**
     * @template {keyof typeof filters} T
     * @param {T} key
     * @param {(typeof filters)[T]} values
     */
    (key, values) => {
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

  /** @type {import('@components/dialogs/Footer').FooterButton[]} */
  const footerOptions = React.useMemo(
    () => [
      {
        name: 'reset',
        action: () => setFilters({ ...defaultFilter }),
        color: 'primary',
      },
      {
        name: 'close',
        action: () => toggleClose(true),
        color: 'secondary',
      },
    ],
    [defaultFilter, filters, setFilters],
  )

  /** @type {import('@mui/material').SwitchProps['onChange']} */
  const handleAllEnabled = React.useCallback(
    ({ target }, checked) => {
      if (target.name === 'all' && checked && !filters.enabled) {
        setFilters('enabled', true)
      }
    },
    [setFilters],
  )

  /** @type {import('@mui/material').SwitchProps['onChange']} */
  const handleShinyActivate = React.useCallback(
    (_, checked) => {
      if (checked) setFilters('enabled', true)
    },
    [setFilters],
  )

  React.useLayoutEffect(() => {
    if (open) backup.current = filters
  }, [open])

  if (!id || !category) return null
  const showMoreFilters = category === 'pokemon' && !easyMode
  const showGenderFilter =
    showMoreFilters ||
    ((category === 'gyms' || category === 'stations') && /^\d+-/.test(id))
  const hasAll = checkIfHasAll(category, id)
  const controlsDisabled = hasAll && filters.all
  const enabledToggle = hasAll ? (
    <DualBoolToggle
      items={ENABLED_ALL}
      field={`filters.${category}.filter.${id}`}
      switchColor="secondary"
      secondColor="success"
      onChange={handleAllEnabled}
    />
  ) : (
    <BoolToggle
      field={`filters.${category}.filter.${id}.enabled`}
      disableGutters
    />
  )
  return (
    <Dialog
      open={!!open}
      onClose={() => toggleClose(false)}
      fullScreen={isMobile && category === 'pokemon'}
    >
      <Header
        titles={`${
          category === 'pokemon' || (!id.startsWith('l') && !id.startsWith('i'))
            ? t('advanced')
            : t('set_size')
        } - ${tId(id, {
          omitFormSuffix: true,
          showDefaultForms: id.startsWith('a') || showDefaultForms,
        })}`}
        action={() => toggleClose(false)}
      />
      <DialogContent sx={{ mt: 3 }}>
        <List>
          {legacyFilter && 'legacy' in ui ? (
            <StringFilter field={`filters.${category}.filter.${id}`} />
          ) : (
            <Grid2
              container
              component={ListItem}
              disableGutters
              disablePadding
              alignItems="flex-start"
            >
              {Object.entries(
                'sliders' in ui && !easyMode ? ui.sliders : {},
              ).map(([subCat, sliders], i) => (
                <Grid2 key={subCat} component={List} xs={12} sm={6}>
                  {sliders.map((each, j) => (
                    <React.Fragment key={`${subCat}${each.name}`}>
                      <ListItem
                        disableGutters
                        disablePadding
                        sx={{ pr: { xs: 0, sm: i ? 0 : 2 } }}
                      >
                        <SliderTile
                          slide={{
                            ...each,
                            // with only shinies the shiny IV range takes over
                            disabled:
                              each.disabled ||
                              controlsDisabled ||
                              (personalShiny &&
                                each.name === 'iv' &&
                                !!filters.personal_shiny_only),
                          }}
                          // @ts-ignore
                          handleChange={handleChange}
                          values={filters[each.name]}
                        />
                      </ListItem>
                      {/* the shiny condition goes right below the IV range */}
                      {!i && !j && showMoreFilters && personalShiny && (
                        <Box sx={{ pr: { xs: 0, sm: 2 } }}>
                          <PersonalShinyFilter
                            field={`filters.${category}.filter.${id}`}
                            disabled={controlsDisabled}
                          />
                        </Box>
                      )}
                    </React.Fragment>
                  ))}
                </Grid2>
              ))}
              {showMoreFilters ? (
                // the left and right halves share each row, so they line up; on a
                // narrow screen the left half comes first, as before
                <>
                  <Grid2 xs={12} sm={6} order={{ xs: 1, sm: 0 }}>
                    <GenderListItem
                      field={`filters.${category}.filter.${id}`}
                      disabled={controlsDisabled}
                      disableGutters
                    />
                  </Grid2>
                  <Grid2
                    xs={12}
                    sm={6}
                    order={{ xs: 3, sm: 0 }}
                    display="flex"
                    alignItems="center"
                    alignSelf="stretch"
                  >
                    <DualBoolToggle
                      items={XXS_XXL}
                      field={`filters.${category}.filter.${id}`}
                      disabled={controlsDisabled}
                      label="size_1-size_5"
                    />
                  </Grid2>
                  <Grid2 xs={12} sm={6} order={{ xs: 2, sm: 0 }}>
                    <Size
                      field={`filters.${category}.filter.${id}`}
                      disableGutters
                    />
                  </Grid2>
                  <Grid2
                    xs={12}
                    sm={6}
                    order={{ xs: 4, sm: 0 }}
                    display="flex"
                    alignItems="center"
                    alignSelf="stretch"
                  >
                    {personalShiny ? (
                      // half a row, so it lines up with the toggles around it
                      <DualBoolToggle
                        items={SHINY_ONLY}
                        field={`filters.${category}.filter.${id}`}
                        label="personal_shiny_only-"
                        disabled={controlsDisabled}
                        onChange={handleShinyActivate}
                      />
                    ) : (
                      enabledToggle
                    )}
                  </Grid2>
                  {personalShiny && (
                    <Grid2 xs={12} sm={6} order={{ xs: 5, sm: 0 }} smOffset={6}>
                      {enabledToggle}
                    </Grid2>
                  )}
                </>
              ) : (
                <>
                  <Grid2 component={List} xs={12}>
                    {showGenderFilter && (
                      <GenderListItem
                        field={`filters.${category}.filter.${id}`}
                        disabled={controlsDisabled}
                        disableGutters
                      />
                    )}
                    <Size
                      field={`filters.${category}.filter.${id}`}
                      disableGutters
                    />
                  </Grid2>
                  <Grid2 component={List} xs={12}>
                    {category === 'pokestops' && (
                      <QuestConditionSelector id={id} />
                    )}
                    {hasAll ? (
                      <DualBoolToggle
                        items={ENABLED_ALL}
                        field={`filters.${category}.filter.${id}`}
                        switchColor="secondary"
                        secondColor="success"
                        onChange={handleAllEnabled}
                      />
                    ) : (
                      <BoolToggle
                        field={`filters.${category}.filter.${id}.enabled`}
                        disableGutters
                      />
                    )}
                  </Grid2>
                </>
              )}
            </Grid2>
          )}
        </List>
      </DialogContent>
      <Footer options={footerOptions} />
    </Dialog>
  )
}

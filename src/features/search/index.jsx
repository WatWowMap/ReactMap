// @ts-check
import * as React from 'react'
import Dialog from '@mui/material/Dialog'
import Box from '@mui/material/Box'
import Popper from '@mui/material/Popper'
import Autocomplete from '@mui/material/Autocomplete'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@hooks/useMemory'
import { useLayoutStore } from '@hooks/useLayoutStore'
import { useStorage } from '@hooks/useStorage'
import Utility from '@services/Utility'
import { fromSearchCategory } from '@utils/fromSearchCategory'
import { useMapStore } from '@hooks/useMapStore'

import { Header } from '@components/dialogs/Header'
import { renderInput } from './renderInput'
import { renderOption } from './renderOption'
import { useSendSearch } from './useSendSearch'

/** @type {import('@mui/material').AutocompleteProps['PopperComponent']} */
const PopperComponent = ({ children, ...props }) => (
  <Popper
    {...props}
    placement="bottom"
    sx={{ height: 0, width: { xs: 'inherit', sm: 500 } }}
  >
    {children}
  </Popper>
)

const handleClose = () => useLayoutStore.setState({ search: false })

/** @type {import('@mui/material').AutocompleteProps['onChange']} */
const handleChange = (_, result) => {
  const { map } = useMapStore.getState()
  const { searchTab } = useStorage.getState()
  handleClose()
  if (typeof result === 'object' && 'lat' in result && 'lon' in result) {
    map.flyTo([result.lat, result.lon], 16)
    useMemory.setState({
      manualParams: {
        category: fromSearchCategory(searchTab),
        id: result.id,
      },
    })
  }
}

const DIALOG_SX = /** @type {import('@mui/material').DialogProps['sx']} */ ({
  '& .MuiDialog-container': {
    alignItems: 'flex-start',
  },
})

const BOX_WIDTH = /** @type {import('@mui/material').BoxProps['width']} */ ({
  xs: 'inherit',
  sm: 500,
})

const STATIC_PROPS =
  /** @type {Omit<import('@mui/material').AutocompleteProps, 'options'>} */ ({
    sx: { p: 2 },
    getOptionLabel: (option) => `${option.id}-${option.with_ar}`,
    filterOptions: (o) => o,
    ListboxProps: {
      sx: { maxHeight: '80cqh' },
    },
    PopperComponent,
    onChange: handleChange,
    renderInput,
    renderOption,
    autoComplete: false,
    clearOnBlur: false,
    fullWidth: true,
    clearIcon: null,
    popupIcon: null,
    open: true,
  })

export default function Search() {
  Utility.analytics('/search')

  const { t } = useTranslation()

  const search = useStorage((state) => state.search)
  const isMobile = useMemory((s) => s.isMobile)
  const open = useLayoutStore((s) => s.search)

  const { loading, options, handleInputChange } = useSendSearch(search, open)

  return (
    <Dialog
      fullScreen={isMobile}
      open={open}
      onClose={handleClose}
      sx={DIALOG_SX}
    >
      <Box width={BOX_WIDTH}>
        <Header titles="search" action={handleClose} />
        <Autocomplete
          freeSolo={!search.length}
          inputValue={search}
          onInputChange={handleInputChange}
          options={options}
          loading={loading}
          loadingText={t('searching')}
          noOptionsText={t('no_options')}
          {...STATIC_PROPS}
        />
      </Box>
    </Dialog>
  )
}

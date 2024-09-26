import Dialog from '@mui/material/Dialog'
import Box from '@mui/material/Box'
import Popper, { PopperProps } from '@mui/material/Popper'
import Autocomplete from '@mui/material/Autocomplete'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { useStorage } from '@store/useStorage'
import { fromSearchCategory } from '@utils/fromSearchCategory'
import { useMapStore } from '@store/useMapStore'
import { useAnalytics } from '@hooks/useAnalytics'
import { Header } from '@components/dialogs/Header'

import { renderInput } from './renderInput'
import { renderOption } from './renderOption'
import { useSendSearch } from './useSendSearch'

const PopperComponent: React.JSXElementConstructor<PopperProps> = ({
  children,
  ...props
}) => (
  <Popper
    {...props}
    placement="bottom"
    sx={{ height: 0, width: { xs: 'inherit', sm: 500 } }}
  >
    {children}
  </Popper>
)

const handleClose = () => useLayoutStore.setState({ search: false })

const DIALOG_SX: import('@mui/material').DialogProps['sx'] = {
  '& .MuiDialog-container': {
    alignItems: 'flex-start',
  },
}

const BOX_WIDTH: import('@mui/material').BoxProps['width'] = {
  xs: 'inherit',
  sm: 500,
}

const STATIC_PROPS: Omit<
  import('@mui/material').AutocompleteProps<any, false, false, boolean>,
  'options'
> = {
  sx: { p: 2 },
  getOptionLabel: (option) => `${option.id}-${option.with_ar}`,
  filterOptions: (o) => o,
  ListboxProps: {
    sx: { maxHeight: '80cqh' },
  },
  PopperComponent,
  onChange: (_, result) => {
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
  },
  renderInput,
  renderOption,
  autoComplete: false,
  clearOnBlur: false,
  fullWidth: true,
  clearIcon: null,
  popupIcon: null,
  open: true,
}

export function Search() {
  useAnalytics('/search')

  const { t } = useTranslation()

  const search = useStorage((s) => s.search)
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

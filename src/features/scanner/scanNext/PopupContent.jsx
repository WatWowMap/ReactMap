// @ts-check
import * as React from 'react'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import ListItem from '@mui/material/ListItem'
import { useTranslation } from 'react-i18next'

import { SCAN_SIZES } from '@assets/constants'

import { useScanStore } from '../hooks/store'
import { ConfigContext } from '../ContextProvider'

export function ScanNextPopup() {
  const { t } = useTranslation()
  const scanNextSize = useScanStore((s) => s.scanNextSize)
  const { nineCellScan } = React.useContext(ConfigContext)

  const setSize = React.useCallback(
    (/** @type {typeof SCAN_SIZES[number]} */ size) => () => {
      useScanStore.setState({ scanNextSize: size })
    },
    [],
  )

  return (
    <ListItem>
      <ButtonGroup size="small" fullWidth>
        {SCAN_SIZES.map((size) => (
          <Button
            key={size}
            onClick={setSize(size)}
            color={size === scanNextSize ? 'primary' : 'secondary'}
            variant={size === scanNextSize ? 'contained' : 'outlined'}
          >
            {size === 'XL' && nineCellScan ? t('scan_next_size_9x9') : t(size)}
          </Button>
        ))}
      </ButtonGroup>
    </ListItem>
  )
}

import * as React from 'react'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import ListItem from '@mui/material/ListItem'
import { useTranslation } from 'react-i18next'
import { SCAN_SIZES } from '@assets/constants'

import { useScanStore } from '../hooks/store'

export function ScanNextPopup() {
  const { t } = useTranslation()
  const scanNextSize = useScanStore((s) => s.scanNextSize)

  const setSize = React.useCallback(
    (size: (typeof SCAN_SIZES)[number]) => () => {
      useScanStore.setState({ scanNextSize: size })
    },
    [],
  )

  return (
    <ListItem>
      <ButtonGroup fullWidth size="small">
        {SCAN_SIZES.map((size) => (
          <Button
            key={size}
            color={size === scanNextSize ? 'primary' : 'secondary'}
            variant={size === scanNextSize ? 'contained' : 'outlined'}
            onClick={setSize(size)}
          >
            {t(size)}
          </Button>
        ))}
      </ButtonGroup>
    </ListItem>
  )
}

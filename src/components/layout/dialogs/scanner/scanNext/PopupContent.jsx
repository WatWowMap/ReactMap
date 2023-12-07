// @ts-check
import * as React from 'react'
import { Button, ButtonGroup, ListItem } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useScanStore } from '../store'

const SIZES = /** @type {const} */ (['S', 'M', 'XL'])

export function ScanNextPopup() {
  const { t } = useTranslation()
  const scanNextSize = useScanStore((s) => s.scanNextSize)

  const setSize = React.useCallback(
    (/** @type {typeof SIZES[number]} */ size) => () => {
      useScanStore.setState({ scanNextSize: size })
    },
    [],
  )

  return (
    <ListItem>
      <ButtonGroup size="small" fullWidth>
        {SIZES.map((size) => (
          <Button
            key={size}
            onClick={setSize(size)}
            color={size === scanNextSize ? 'primary' : 'secondary'}
            variant={size === scanNextSize ? 'contained' : 'outlined'}
          >
            {t(size)}
          </Button>
        ))}
      </ButtonGroup>
    </ListItem>
  )
}

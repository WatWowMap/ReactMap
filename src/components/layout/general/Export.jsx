import * as React from 'react'
import { Button } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function ExportButton({ json, fileName }) {
  const { t } = useTranslation()
  return (
    <Button
      style={{ minWidth: 100 }}
      variant="contained"
      color="secondary"
      size="small"
      onClick={() => {
        const el = document.createElement('a')
        el.setAttribute(
          'href',
          `data:application/json;chartset=utf-8,${encodeURIComponent(json)}`,
        )
        el.setAttribute('download', fileName)
        el.style.display = 'none'
        document.body.appendChild(el)
        el.click()
        document.body.removeChild(el)
      }}
    >
      {t('export')}
    </Button>
  )
}

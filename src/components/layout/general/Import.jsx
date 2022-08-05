import * as React from 'react'
import { Button } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function ImportButton({ onload, postCb }) {
  const { t } = useTranslation()
  return (
    <>
      <input
        accept="application/json"
        id="contained-button-file"
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files[0]
          if (file) {
            const reader = new FileReader()
            reader.onload = onload
            reader.readAsText(file)
            if (postCb) {
              postCb()
            }
          }
        }}
      />
      <label htmlFor="contained-button-file">
        <Button
          component="span"
          style={{ minWidth: 100 }}
          variant="contained"
          color="primary"
          size="small"
        >
          {t('import')}
        </Button>
      </label>
    </>
  )
}

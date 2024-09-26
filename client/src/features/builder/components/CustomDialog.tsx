import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import DialogContent from '@mui/material/DialogContent'
import { useTranslation } from 'react-i18next'

import { Header } from '@components/dialogs/Header'
import { Footer } from '@components/dialogs/Footer'

import { getBlockContent } from '../utils'
import { Config } from '@rm/types'

export function CustomDialog({
  configObj,
  defaultTitle,
  handleClose,
  children,
}: {
  configObj: Config['map']['messageOfTheDay'] | Config['map']['donationPage']
  defaultTitle: string
  handleClose: () => void
  children: React.ReactNode
}) {
  const { t, i18n } = useTranslation()
  const [countdown, setCountdown] = React.useState(
    Math.floor(
      configObj.settings &&
        'timeoutSeconds' in configObj.settings &&
        typeof configObj.settings?.timeoutSeconds === 'number'
        ? configObj.settings?.timeoutSeconds
        : 0,
    ),
  )

  const [footerOptions, setFooterOptions] = React.useState([
    ...(configObj.footerButtons || []).map((b) => ({
      ...b,
      name: getBlockContent(b.name),
    })),
    {
      name: `${t('close')}${countdown ? ` (${countdown})` : ''}`,
      action: handleClose,
      color: 'primary',
      disabled: !!countdown,
    },
  ])

  React.useEffect(() => {
    setFooterOptions([
      ...(configObj.footerButtons || []).map((b) => ({
        ...b,
        name: getBlockContent(b.name),
      })),
      {
        name: `${t('close')}${countdown ? ` (${countdown})` : ''}`,
        action: handleClose,
        color: 'primary',
        disabled: !!countdown,
      },
    ])
  }, [configObj])

  React.useEffect(() => {
    if (countdown > 0) {
      const timeout = setTimeout(() => {
        const newTime = countdown - 1
        setCountdown(newTime)
        setFooterOptions((prev) => {
          const last = prev.at(-1)
          return [
            ...prev.slice(0, prev.length - 1),
            {
              ...last,
              name: `${t('close')}${newTime ? ` (${newTime})` : ''}`,
              disabled: !!newTime,
            },
          ]
        })
      }, 1000)
      return () => clearTimeout(timeout)
    }
  }, [countdown])

  return (
    <>
      <Header
        titles={
          configObj.titles?.length
            ? configObj.titles.map((title) => getBlockContent(title))
            : [defaultTitle]
        }
      />
      <DialogContent key={i18n.language}>
        <Grid
          container
          spacing={configObj.settings.parentSpacing || 0}
          alignItems={configObj.settings.parentAlignItems || 'center'}
          justifyContent={configObj.settings.parentJustifyContent || 'center'}
          style={configObj.settings.parentStyle || {}}
        >
          {children}
        </Grid>
      </DialogContent>
      <Footer options={footerOptions} />
    </>
  )
}

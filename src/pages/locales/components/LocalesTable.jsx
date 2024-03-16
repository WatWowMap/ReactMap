// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@apollo/client'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Box from '@mui/material/Box'

import { LOCALES_STATUS } from '@services/queries/config'
import { VirtualTable } from '@components/virtual/Table'

import { setScrolling, useLocalesStore } from '../hooks/store'
import { EditLocale } from './EditLocale'

/** @type {import('react-virtuoso').TableVirtuosoProps['fixedHeaderContent']} */
function fixedHeaderContent() {
  const { t } = useTranslation()
  return (
    <TableRow sx={{ bgcolor: 'background.paper' }}>
      <TableCell>{t('key')}</TableCell>
      <TableCell>{t('locale_selection_en')}</TableCell>
      <TableCell>{t('ai')}</TableCell>
      <TableCell width="40%">{t('human')}</TableCell>
    </TableRow>
  )
}

/** @type {import('react-virtuoso').TableVirtuosoProps['itemContent']} */
function itemContent(_index, row) {
  return (
    <>
      <TableCell>{row.name}</TableCell>
      <TableCell>{row.english}</TableCell>
      <TableCell>{row.ai}</TableCell>
      <TableCell width="40%">
        <EditLocale
          name={row.name}
          type={typeof row.english === 'number' ? 'number' : 'text'}
        />
      </TableCell>
    </>
  )
}

export function LocalesTable() {
  const { i18n } = useTranslation()
  const all = useLocalesStore((s) => s.all)

  const { data, loading } = useQuery(LOCALES_STATUS, {
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-only',
    variables: { locale: i18n.language },
  })

  const { data: enData, loading: enLoading } = useQuery(LOCALES_STATUS, {
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-only',
    variables: { locale: 'en' },
  })

  const stringSorter = new Intl.Collator(i18n.language, {
    sensitivity: 'base',
    ignorePunctuation: true,
  })

  const rows = React.useMemo(() => {
    if (data?.locales && enData?.locales) {
      const { missing, ai } = data.locales
      /** @type {string[]} */
      const source = all ? Object.keys(enData.locales.human) : missing
      return source.toSorted(stringSorter.compare).map((key) => ({
        name: key,
        english: enData.locales.human[key],
        ai: ai[key],
        missing: !!missing[key],
        type: typeof enData.locales.human[key],
      }))
    }
    return []
  }, [data, enData, all])

  React.useEffect(() => {
    if (Array.isArray(data?.locales?.missing)) {
      useLocalesStore.setState({
        custom: all
          ? data?.locales.human
          : Object.fromEntries(data.locales.missing.map((key) => [key, ''])),
        existingHuman: data.locales.human || {},
      })
    }
  }, [data, all])

  return (
    <Box component="main" flex={1} overflow="auto">
      <VirtualTable
        data={loading || enLoading ? [] : rows}
        fixedHeaderContent={fixedHeaderContent}
        itemContent={itemContent}
        isScrolling={setScrolling}
      />
    </Box>
  )
}

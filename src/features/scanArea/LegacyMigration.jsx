// @ts-check
import * as React from 'react'
import { useQuery } from '@apollo/client'

import { Query } from '@services/queries'
import { useStorage } from '@store/useStorage'

import { migrateLegacyAreaKeys } from './utils'

export function LegacyScanAreaMigration() {
  const selectedAreas = useStorage(
    (s) => s.filters.scanAreas?.filter?.areas || [],
  )
  const { data } = useQuery(Query.scanAreasMenu(), {
    skip: !selectedAreas.length,
  })

  const features = React.useMemo(
    () =>
      data?.scanAreasMenu.flatMap((parent) => [
        ...(parent.details ? [parent.details] : []),
        ...parent.children,
      ]) || [],
    [data],
  )
  const migratedAreas = React.useMemo(
    () =>
      features.length ? migrateLegacyAreaKeys(features, selectedAreas) : null,
    [features, selectedAreas],
  )

  React.useEffect(() => {
    if (!migratedAreas?.length) return

    useStorage.setState((prev) => ({
      filters: {
        ...prev.filters,
        scanAreas: {
          ...prev.filters.scanAreas,
          filter: {
            ...prev.filters.scanAreas?.filter,
            areas: migratedAreas,
          },
        },
      },
    }))
  }, [migratedAreas])

  return null
}

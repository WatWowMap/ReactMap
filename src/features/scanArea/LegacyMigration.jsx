// @ts-check
import * as React from 'react'
import { useQuery } from '@apollo/client'

import { Query } from '@services/queries'
import { useStorage } from '@store/useStorage'

import { getScanAreaMenuFeatures, migrateLegacyAreaKeys } from './utils'

/** @param {{ children: React.ReactNode }} props */
export function LegacyScanAreaGate({ children }) {
  const selectedAreas = useStorage(
    (s) => s.filters.scanAreas?.filter?.areas || [],
  )
  const hasSelectedAreas = selectedAreas.length > 0
  const { data, error } = useQuery(Query.scanAreasMenu(), {
    skip: !hasSelectedAreas,
  })

  const features = React.useMemo(
    () => getScanAreaMenuFeatures(data?.scanAreasMenu || []),
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

  if (hasSelectedAreas && !error && (!data || migratedAreas)) {
    return null
  }

  return children
}

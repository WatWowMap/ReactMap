// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'
import TableCell from '@mui/material/TableCell'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Grid2 from '@mui/material/Unstable_Grid2'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useMap } from 'react-leaflet'

import { useDeepStore, useStorage } from '@store/useStorage'
import { useMemory } from '@store/useMemory'

/**
 * @param {{
 *  name?: string
 *  feature?: Pick<import('@rm/types').RMFeature, 'properties'>
 *  allAreas?: string[]
 *  childAreas?: Pick<import('@rm/types').RMFeature, 'properties'>[]
 *  allChildAreas?: Pick<import('@rm/types').RMFeature, 'properties'>[]
 *  groupKey?: string
 *  borderRight?: boolean
 *  colSpan?: number
 * }} props
 */
export function AreaChild({
  name,
  feature,
  childAreas,
  allChildAreas,
  groupKey,
  allAreas,
  borderRight,
  colSpan = 1,
}) {
  const scanAreas = useStorage((s) => s.filters?.scanAreas?.filter?.areas)
  const zoom = useMemory((s) => s.config.general.scanAreasZoom)
  const expandAllScanAreas = useMemory((s) => s.config.misc.expandAllScanAreas)
  const accessibleAreaKeys = useMemory(
    (s) => s.auth.perms.areaRestrictions || [],
  )
  const map = useMap()

  const { setAreas } = useStorage.getState()
  const [open, setOpen] = useDeepStore('scanAreasMenu', '')

  if (!scanAreas) return null

  const groupedChildren = name
    ? childAreas?.length
      ? childAreas
      : allChildAreas || childAreas || []
    : allChildAreas || childAreas || []
  const groupedAreaKeys = groupedChildren
    .filter((child) => !child.properties.manual)
    .map((child) => child.properties.key)
  const allGroupedAreaKeys = (allChildAreas || childAreas || [])
    .filter((child) => !child.properties.manual)
    .map((child) => child.properties.key)
  const isSearchScopedGroup =
    !!name &&
    groupedAreaKeys.length > 0 &&
    allGroupedAreaKeys.some((key) => !groupedAreaKeys.includes(key))
  const parentAreaKey =
    groupKey ||
    (feature?.properties?.key && !feature.properties.manual
      ? feature.properties.key
      : undefined)
  const parentAreaKeys =
    name &&
    parentAreaKey &&
    !isSearchScopedGroup &&
    (!accessibleAreaKeys.length || accessibleAreaKeys.includes(parentAreaKey))
      ? [parentAreaKey]
      : []
  const coveredByParentSelection =
    !!name &&
    !!parentAreaKey &&
    isSearchScopedGroup &&
    scanAreas.includes(parentAreaKey)
  const selectableAreaKeys = name
    ? [...new Set([...groupedAreaKeys, ...parentAreaKeys])]
    : []
  const removableAreaKeys =
    name && parentAreaKey
      ? [...new Set([...selectableAreaKeys, parentAreaKey])]
      : selectableAreaKeys
  const hasAll = name
    ? coveredByParentSelection ||
      (selectableAreaKeys.length
        ? selectableAreaKeys.every((key) => scanAreas.includes(key))
        : false)
    : false
  const hasSome = name
    ? coveredByParentSelection ||
      (removableAreaKeys.length
        ? removableAreaKeys.some((key) => scanAreas.includes(key))
        : false)
    : false
  const allChildrenManual =
    name &&
    !!groupedChildren.length &&
    groupedChildren.every((child) => child.properties.manual)
  const hasManual = name
    ? !selectableAreaKeys.length &&
      (feature?.properties?.manual || allChildrenManual)
    : feature?.properties?.manual
  const color =
    hasManual || (name ? !selectableAreaKeys.length : !feature.properties.name)
      ? 'transparent'
      : 'none'
  const coveredByGroup =
    !name && !feature?.properties?.manual && groupKey
      ? scanAreas.includes(groupKey)
      : false

  const nameProp =
    name || feature?.properties?.formattedName || feature?.properties?.name
  const hasExpand = name && !expandAllScanAreas && !!childAreas?.length
  return (
    <TableCell
      colSpan={colSpan}
      sx={(theme) => ({
        bgcolor: theme.palette.background.paper,
        p: 0,
        borderRight: borderRight ? 1 : 'inherit',
        borderColor:
          theme.palette.grey[theme.palette.mode === 'dark' ? 800 : 200],
      })}
    >
      <Grid2
        container
        alignItems="center"
        justifyContent="space-between"
        component={Button}
        fullWidth
        borderRadius={0}
        variant="text"
        color="inherit"
        size="small"
        wrap="nowrap"
        onClick={() => {
          if (feature?.properties?.center) {
            map.flyTo(
              feature.properties.center,
              feature.properties.zoom || zoom,
            )
          }
        }}
        sx={(theme) => ({
          py: name ? 'inherit' : 0,
          minHeight: 36,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        })}
      >
        {!hasExpand && hasManual ? null : (
          <Checkbox
            size="small"
            color="secondary"
            indeterminate={name ? hasSome && !hasAll : false}
            checked={
              name
                ? hasAll
                : coveredByGroup || scanAreas.includes(feature.properties.key)
            }
            onClick={(e) => e.stopPropagation()}
            onChange={() => {
              let areaKeys = name
                ? hasSome
                  ? removableAreaKeys
                  : selectableAreaKeys
                : feature.properties.key
              let unselectAll = name ? hasSome : false

              if (name && coveredByParentSelection) {
                const hiddenSiblingKeys = allGroupedAreaKeys.filter(
                  (key) => !groupedAreaKeys.includes(key),
                )
                areaKeys = [
                  parentAreaKey,
                  ...groupedAreaKeys.filter((key) => scanAreas.includes(key)),
                  ...hiddenSiblingKeys.filter(
                    (key) => !scanAreas.includes(key),
                  ),
                ]
                unselectAll = false
              } else if (!name && coveredByGroup) {
                const siblingAreaKeys = (allChildAreas || childAreas || [])
                  .filter(
                    (child) =>
                      !child.properties.manual &&
                      child.properties.key !== feature.properties.key,
                  )
                  .map((child) => child.properties.key)
                areaKeys = [
                  groupKey,
                  ...(scanAreas.includes(feature.properties.key)
                    ? [feature.properties.key]
                    : []),
                  ...siblingAreaKeys.filter((key) => !scanAreas.includes(key)),
                ]
                unselectAll = false
              }

              setAreas(areaKeys, allAreas, unselectAll)
            }}
            sx={{
              p: 1,
              color,
              '&.Mui-checked': {
                color,
              },
              '&.Mui-disabled': {
                color,
              },
            }}
            disabled={
              (name ? !selectableAreaKeys.length : !feature.properties.name) ||
              hasManual
            }
          />
        )}
        <Typography
          variant={name ? 'h6' : 'caption'}
          align="center"
          style={{ whiteSpace: 'pre-wrap', flexGrow: 1 }}
        >
          {nameProp || <>&nbsp;</>}
        </Typography>
        {hasExpand && (
          <IconButton
            component="span"
            className={open === name ? 'expanded' : 'collapsed'}
            onClick={(e) => {
              e.stopPropagation()
              return setOpen((prev) => (prev === name ? '' : name))
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        )}
      </Grid2>
    </TableCell>
  )
}

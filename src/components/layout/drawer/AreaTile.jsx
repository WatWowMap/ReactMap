import * as React from 'react'
import {
  Typography,
  Checkbox,
  TableCell,
  Button,
  IconButton,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

import Utility from '@services/Utility'
import Grid2 from '@mui/material/Unstable_Grid2'

export default function AreaTile({
  name,
  feature,
  childAreas,
  scanAreasZoom,
  allAreas,
  map,
  borderRight,
  scanAreas,
  setAreas,
  colSpan = 1,
  open,
  setOpen,
}) {
  if (!scanAreas) return null

  const hasAll =
    childAreas &&
    childAreas.every(
      (c) =>
        c.properties.manual ||
        scanAreas.filter.areas.includes(c.properties.key),
    )
  const hasSome =
    childAreas &&
    childAreas.some((c) => scanAreas.filter.areas.includes(c.properties.key))
  const hasManual =
    feature?.properties?.manual || childAreas.every((c) => c.properties.manual)
  const color =
    hasManual || (name ? !childAreas.length : !feature.properties.name)
      ? 'transparent'
      : 'none'

  const nameProp =
    name || feature.properties.formattedName || feature.properties.name
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
              feature.properties.zoom || scanAreasZoom,
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
        {!name && hasManual ? null : (
          <Checkbox
            size="small"
            color="secondary"
            indeterminate={name ? hasSome && !hasAll : false}
            checked={
              name
                ? hasAll
                : scanAreas.filter.areas.includes(feature.properties.key)
            }
            onClick={(e) => e.stopPropagation()}
            onChange={() =>
              setAreas(
                name
                  ? childAreas.map((c) => c.properties.key)
                  : feature.properties.key,
                allAreas,
                name ? hasSome : false,
              )
            }
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
              (name ? !childAreas.length : !feature.properties.name) ||
              hasManual
            }
          />
        )}
        <Typography
          variant={name ? 'h6' : 'caption'}
          align="center"
          style={{ whiteSpace: 'pre-wrap', flexGrow: 1 }}
        >
          {feature.properties.reactMapFormat && nameProp
            ? Utility.getProperName(nameProp)
            : nameProp || <>&nbsp;</>}
        </Typography>
        {name && setOpen && (
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

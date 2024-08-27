// @ts-check

import * as React from 'react'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import { TableVirtuoso } from 'react-virtuoso'

const COMPONENTS =
  /** @type {import('react-virtuoso').TableVirtuosoProps['components']} */ ({
    Scroller: React.forwardRef((props, ref) => (
      <TableContainer component={Paper} {...props} ref={ref} />
    )),
    Table: (props) => (
      <Table
        {...props}
        sx={{ borderCollapse: 'separate', tableLayout: 'fixed' }}
      />
    ),
    TableHead: React.forwardRef((props, ref) => (
      <TableHead {...props} ref={ref} />
    )),
    // eslint-disable-next-line no-unused-vars
    TableRow: ({ item: _, ...props }) => <TableRow {...props} />,
    TableBody: React.forwardRef((props, ref) => (
      <TableBody {...props} ref={ref} />
    )),
  })

/** @param {import('react-virtuoso').TableVirtuosoProps} props */
export function VirtualTable(props) {
  return <TableVirtuoso components={COMPONENTS} {...props} />
}

// @ts-check
/* eslint-disable react/no-array-index-key */
import * as React from 'react'
import { useQuery } from '@apollo/client'
import Dialog from '@mui/material/Dialog'

import { CUSTOM_COMPONENT } from '@services/queries/config'
import { useMemory } from '@hooks/useMemory'
import { useLayoutStore } from '@hooks/useLayoutStore'
import { Loading } from '@components/Loading'

import { CustomDialog } from './components/CustomDialog'
import { CustomTile } from './components/CustomTile'

const DEFAULT = {
  settings: {},
  components: [],
  titles: [],
  footerButtons: [],
}

const handleClose = () => useLayoutStore.setState({ donorPage: false })

export function DonorPage() {
  const open = useLayoutStore((s) => s.donorPage)
  const isMobile = useMemory((s) => s.isMobile)

  const { data, loading } = useQuery(CUSTOM_COMPONENT, {
    fetchPolicy: 'cache-first',
    variables: { component: 'donationPage' },
    skip: !open,
  })

  const donorPage = /** @type {typeof DEFAULT} */ (
    data?.customComponent || DEFAULT
  )

  return (
    <Dialog open={open} fullScreen={isMobile} onClose={handleClose}>
      <CustomDialog
        configObj={donorPage}
        defaultTitle="donor_page"
        handleClose={handleClose}
      >
        {loading ? (
          <Loading />
        ) : (
          donorPage.components.map((block, i) => (
            <CustomTile key={i} block={block} />
          ))
        )}
      </CustomDialog>
    </Dialog>
  )
}

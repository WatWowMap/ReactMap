// @ts-check
/* eslint-disable react/no-array-index-key */
import * as React from 'react'
import { useQuery } from '@apollo/client'
import Dialog from '@mui/material/Dialog'

import { CUSTOM_COMPONENT } from '@services/queries/config'
import { useDialogStore, useStatic } from '@hooks/useStore'

import DialogWrapper from '../custom/DialogWrapper'
import CustomTile from '../custom/CustomTile'
import { Loading } from '../general/Loading'

const DEFAULT = {
  settings: {},
  components: [],
  titles: [],
  footerButtons: [],
}

const handleClose = () => useDialogStore.setState({ donorPage: false })

export default function DonorPage() {
  const open = useDialogStore((s) => s.donorPage)
  const isMobile = useStatic((s) => s.isMobile)

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
      <DialogWrapper
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
      </DialogWrapper>
    </Dialog>
  )
}

// @ts-check
/* eslint-disable react/no-array-index-key */

import { useQuery } from '@apollo/client'
import { Loading } from '@components/Loading'
import Dialog from '@mui/material/Dialog'

import { CUSTOM_COMPONENT } from '@services/queries/config'
import { useLayoutStore } from '@store/useLayoutStore'
import { useMemory } from '@store/useMemory'

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
            // biome-ignore lint/suspicious/noArrayIndexKey: pre-existing, tracked for follow-up
            <CustomTile key={i} block={block} />
          ))
        )}
      </CustomDialog>
    </Dialog>
  )
}

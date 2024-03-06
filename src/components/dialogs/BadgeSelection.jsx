// @ts-check
import * as React from 'react'
import DialogContent from '@mui/material/DialogContent'
import Dialog from '@mui/material/Dialog'
import { useMutation } from '@apollo/client'

import { apolloClient, apolloCache } from '@services/apollo'
import { Query } from '@services/Query'
import { ENUM_BADGES } from '@assets/constants'
import { useLayoutStore } from '@store/useLayoutStore'
import { MultiSelector } from '@components/inputs/MultiSelector'

import { Header } from './Header'
import { Footer } from './Footer'

const handleClose = () =>
  useLayoutStore.setState({
    gymBadge: {
      open: false,
      gymId: '',
      badge: 0,
    },
  })

const footerOptions = /** @type {import('./Footer').FooterButton[]} */ ([
  {
    name: 'close',
    action: handleClose,
    color: 'primary',
    align: 'right',
  },
])

export function BadgeSelection() {
  const { gymId, badge, open } = useLayoutStore((s) => s.gymBadge)
  const [setBadgeInDb] = useMutation(Query.user('SET_GYM_BADGE'), {
    refetchQueries: ['GetBadgeInfo', 'Gyms', 'Raids', 'GymsRaids'],
  })

  /** @type {import('packages/types/lib').MultiSelectorProps<typeof badge>['onClick']} */
  const onClick = React.useCallback(
    (_, newV) => () => {
      setBadgeInDb({
        variables: {
          badge: newV,
          gymId,
        },
      })
      apolloClient.cache.modify({
        id: apolloCache.identify({ __typename: 'Gym', id: gymId }),
        fields: {
          badge() {
            return newV
          },
        },
      })
      handleClose()
    },
    [setBadgeInDb, gymId],
  )

  return (
    <Dialog open={open} onClose={handleClose}>
      <Header titles="gym_badge_menu" action={handleClose} />
      <DialogContent sx={{ mt: 2 }}>
        <MultiSelector
          items={ENUM_BADGES}
          value={badge || 0}
          onClick={onClick}
          tKey="badge_"
        />
      </DialogContent>
      <Footer options={footerOptions} role="webhook_footer" />
    </Dialog>
  )
}

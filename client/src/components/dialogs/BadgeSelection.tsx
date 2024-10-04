import * as React from 'react'
import DialogContent from '@mui/material/DialogContent'
import Dialog from '@mui/material/Dialog'
import { useMutation } from '@apollo/client'
import { apolloClient, apolloCache } from '@services/apollo'
import { Query } from '@services/queries'
import { ENUM_BADGES } from '@assets/constants'
import { useLayoutStore } from '@store/useLayoutStore'
import {
  MultiSelector,
  MultiSelectorProps,
} from '@components/inputs/MultiSelector'

import { Header } from './Header'
import { Footer, FooterButton } from './Footer'

const handleClose = () =>
  useLayoutStore.setState({
    gymBadge: {
      open: false,
      gymId: '',
      badge: 0,
    },
  })

const footerOptions: FooterButton[] = [
  {
    name: 'close',
    action: handleClose,
    color: 'primary',
    align: 'right',
  },
]

export function BadgeSelection() {
  const { gymId, badge, open } = useLayoutStore((s) => s.gymBadge)
  const [setBadgeInDb] = useMutation(Query.user('SET_GYM_BADGE'), {
    refetchQueries: ['GetBadgeInfo', 'Gyms', 'Raids', 'GymsRaids'],
  })

  const onClick: MultiSelectorProps<typeof badge>['onClick'] =
    React.useCallback(
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
      <Header action={handleClose} titles="gym_badge_menu" />
      <DialogContent sx={{ mt: 2 }}>
        <MultiSelector
          items={ENUM_BADGES}
          tKey="badge_"
          value={badge || 0}
          onClick={onClick}
        />
      </DialogContent>
      <Footer i18nKey="webhook_footer" options={footerOptions} />
    </Dialog>
  )
}

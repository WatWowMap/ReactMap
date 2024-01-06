// @ts-check
import * as React from 'react'
import DialogContent from '@mui/material/DialogContent'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'
import { apolloClient, apolloCache } from '@services/apollo'

import Query from '@services/Query'

import Header from '../general/Header'
import Footer from '../general/Footer'

export default function BadgeSelection({ id, setBadgeMenu, badge }) {
  const { t } = useTranslation()

  const [setBadgeInDb] = useMutation(Query.user('setGymBadge'), {
    refetchQueries: ['GetBadgeInfo'],
  })

  return (
    <>
      <Header titles="gym_badge_menu" action={() => setBadgeMenu(false)} />
      <DialogContent>
        <ButtonGroup sx={{ pt: 2 }}>
          {[0, 1, 2, 3].map((i) => (
            <Button
              key={i}
              size="small"
              onClick={() => {
                setBadgeInDb({
                  variables: {
                    badge: i,
                    gymId: id,
                  },
                })
                apolloClient.cache.modify({
                  id: apolloCache.identify({ __typename: 'Gym', id }),
                  fields: {
                    badge() {
                      return i
                    },
                  },
                })
                setBadgeMenu(false)
              }}
              color={badge === i ? 'primary' : 'secondary'}
              variant={badge === i ? 'contained' : 'outlined'}
            >
              {t(`badge_${i}`)}
            </Button>
          ))}
        </ButtonGroup>
      </DialogContent>
      <Footer
        options={[
          {
            name: 'close',
            action: () => setBadgeMenu(false),
            color: 'primary',
            align: 'right',
          },
        ]}
        role="webhook_footer"
      />
    </>
  )
}

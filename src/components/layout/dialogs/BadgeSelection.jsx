import React from 'react'
import { DialogContent, ButtonGroup, Button } from '@material-ui/core'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'

import Query from '@services/Query'

import Header from '../general/Header'
import Footer from '../general/Footer'

export default function BadgeSelection({ gym, setBadgeMenu, badge, setBadge }) {
  const { t } = useTranslation()

  const [setBadgeInDb] = useMutation(Query.user('setGymBadge'), {
    refetchQueries: ['GetBadgeInfo'],
  })
  return (
    <>
      <Header titles={['gym_badge_menu']} action={() => setBadgeMenu(false)} />
      <DialogContent>
        <ButtonGroup>
          {[0, 1, 2, 3].map(i => (
            <Button
              key={i}
              size="small"
              onClick={() => {
                setBadgeInDb({
                  variables: {
                    badge: i,
                    gymId: gym.id,
                  },
                })
                setBadge(i)
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
      <Footer options={[{ name: 'close', action: () => setBadgeMenu(false), color: 'primary', align: 'right' }]} role="webhook_footer" />
    </>
  )
}

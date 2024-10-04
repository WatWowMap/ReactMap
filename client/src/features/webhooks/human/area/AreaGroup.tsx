import * as React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2'
import Divider from '@mui/material/Divider'
import { useTranslation } from 'react-i18next'
import { Loading } from '@components/Loading'
import { BasicAccordion } from '@components/BasicAccordion'
import { useWebhookStore } from '@store/useWebhookStore'

import { useGetAreas } from '../../hooks/useGetAreas'

import { MemoAreaChip } from './AreaChip'

export const AreaGroup = () => {
  const { data, loading } = useGetAreas()
  const { t } = useTranslation()

  return loading ? (
    <Loading>{t('loading', { category: t('areas') })}</Loading>
  ) : (
    data.map(({ group, children }, index) => (
      <React.Fragment key={group}>
        {index === 0 && (
          <Divider
            flexItem
            style={{ margin: '20px 0', width: '100%', height: 2 }}
          />
        )}
        <GroupTile key={group} areas={children} group={group}>
          {children.map((child) => (
            <MemoAreaChip key={`${group}_${child}`} name={child} />
          ))}
        </GroupTile>
      </React.Fragment>
    ))
  )
}

const GroupTile = ({
  children,
  group,
  areas,
}: {
  children: React.ReactNode[]
  group: string
  areas: string[]
}) => {
  const count = useWebhookStore(
    (s) => s.human.area?.filter((a) => areas.includes(a)).length,
  )

  if (children.length === 0) return null

  return (
    <Grid2 xs={12}>
      {group ? (
        <BasicAccordion
          stateKey={group}
          title={`${group} - ${count} / ${areas.length}`}
        >
          {children}
        </BasicAccordion>
      ) : (
        children
      )}
    </Grid2>
  )
}

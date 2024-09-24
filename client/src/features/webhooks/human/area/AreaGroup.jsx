// @ts-check
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
        <GroupTile key={group} group={group} areas={children}>
          {children.map((child) => (
            <MemoAreaChip key={`${group}_${child}`} name={child} />
          ))}
        </GroupTile>
      </React.Fragment>
    ))
  )
}

/** @param {{ children: React.ReactNode[], group: string, areas: string[] }} props */
const GroupTile = ({ children, group, areas }) => {
  const count = useWebhookStore(
    (s) => s.human.area?.filter((a) => areas.includes(a)).length,
  )
  if (children.length === 0) return null
  return (
    <Grid2 xs={12}>
      {group ? (
        <BasicAccordion
          title={`${group} - ${count} / ${areas.length}`}
          stateKey={group}
        >
          {children}
        </BasicAccordion>
      ) : (
        children
      )}
      {/* <Grid2 xs={group ? 4 : 12} textAlign="center">
        <Typography variant="h4" gutterBottom>
          {group}
        </Typography>
      </Grid2>

      {group && (
        <Grid2 xs={4} textAlign="center">
          <AreaAction action="none" group={group} color="primary">
            {t('disable_all')}
          </AreaAction>
        </Grid2>
      )}

      {group && (
        <Grid2 xs={4} textAlign="center">
          <AreaAction action="all" group={group} color="secondary">
            {t('enable_all')}
          </AreaAction>
        </Grid2>
      )} */}
    </Grid2>
  )
}

// /**
//  *
//  * @param {{
//  *  action: string,
//  *  children: React.ReactNode,
//  *  color: import('@mui/material').ButtonProps['color']
//  *  group?: string
//  * }} props
//  * @returns
//  */
// export const AreaAction = ({ action, children, color, group }) => (
//   <Button
//     size="small"
//     variant="contained"
//     color={color}
//     onClick={handleClick(action, group)}
//   >
//     {children}
//   </Button>
// )

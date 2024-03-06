// @ts-check
import * as React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'

import { Loading } from '@components/Loading'
import { handleClick } from '@store/useWebhookStore'

import { useGetAreas } from '../../hooks/useGetAreas'
import { MemoAreaChip } from './AreaChip'

export const AreaGroup = () => {
  const { data, loading } = useGetAreas()
  const { t } = useTranslation()

  return loading ? (
    <Loading>{t('loading', { category: t('areas') })}</Loading>
  ) : (
    data.map(({ group, children }) => (
      <GroupTile key={group} group={group}>
        {children.map((child) => (
          <MemoAreaChip key={`${group}_${child}`} name={child} />
        ))}
      </GroupTile>
    ))
  )
}

/**
 *
 * @param {{ group: string, children: React.ReactNode[] }} props
 * @returns
 */
const GroupTile = ({ group, children }) => {
  const { t } = useTranslation()
  if (children.length === 0) return null
  return (
    <Grid2 container xs={12}>
      <Divider
        flexItem
        style={{ margin: '20px 0', width: '100%', height: 2 }}
      />
      <Grid2 xs={group ? 4 : 12} textAlign="center">
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
      )}
      {children}
    </Grid2>
  )
}

/**
 *
 * @param {{
 *  action: string,
 *  children: React.ReactNode,
 *  color: import('@mui/material').ButtonProps['color']
 *  group?: string
 * }} props
 * @returns
 */
export const AreaAction = ({ action, children, color, group }) => (
  <Button
    size="small"
    variant="contained"
    color={color}
    onClick={handleClick(action, group)}
  >
    {children}
  </Button>
)

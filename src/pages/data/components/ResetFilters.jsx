// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@hooks/useMemory'
import { resetFilter, resetFilters } from '@utils/resetState'
import Utility from '@services/Utility'

import {
  ButtonWithNotification,
  ChildContainer,
  StyledDivider,
  StyledSubHeader,
} from './Shared'
import { useDataManagementStore } from '../hooks/store'

export function ResetFilters() {
  const { t } = useTranslation()
  const perms = useMemory((s) => s.auth.perms)
  const filters = useMemory((s) => s.filters)
  const isHovering = useDataManagementStore((s) => s.resetFiltersHover)

  return (
    <ChildContainer>
      <StyledSubHeader>{t('reset_filters_title')}</StyledSubHeader>
      {Object.keys(filters)
        .filter((perm) => perms[perm])
        .map((/** @type {import('@rm/types').Categories} */ key) => (
          <ButtonWithNotification
            key={key}
            onClick={() => resetFilter(key)}
            color="warning.main"
            label={t(`reset_${Utility.camelToSnake(key)}`)}
            category="filter"
            isHovering={isHovering}
          />
        ))}
      <StyledDivider />
      <ButtonWithNotification
        onClick={resetFilters}
        label={t('reset_all')}
        color="error.main"
        category="filter"
        all
        onMouseEnter={() =>
          useDataManagementStore.setState({ resetFiltersHover: true })
        }
        onMouseLeave={() =>
          useDataManagementStore.setState({ resetFiltersHover: false })
        }
      />
    </ChildContainer>
  )
}

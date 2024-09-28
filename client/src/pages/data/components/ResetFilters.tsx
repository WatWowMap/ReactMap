import { useTranslation } from 'react-i18next'
import { useMemory } from '@store/useMemory'
import { resetFilter, resetFilters } from '@utils/resetState'
import { camelToSnake } from '@utils/strings'

import { useDataManagementStore } from '../hooks/store'

import {
  ButtonWithNotification,
  ChildContainer,
  StyledDivider,
  StyledSubHeader,
} from './Shared'

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
        .map((key: import('@rm/types').Categories) => (
          <ButtonWithNotification
            key={key}
            category="filter"
            color="warning.main"
            isHovering={isHovering}
            label={t(`reset_${camelToSnake(key)}`)}
            onClick={() => resetFilter(key)}
          />
        ))}
      <StyledDivider />
      <ButtonWithNotification
        all
        category="filter"
        color="error.main"
        label={t('reset_all')}
        onClick={resetFilters}
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

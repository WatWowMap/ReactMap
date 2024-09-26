import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { resetFilter, resetFilters } from '@utils/resetState'
import { camelToSnake } from '@utils/strings'

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
        .map((key: import('@rm/types').Categories) => (
          <ButtonWithNotification
            key={key}
            onClick={() => resetFilter(key)}
            color="warning.main"
            label={t(`reset_${camelToSnake(key)}`)}
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

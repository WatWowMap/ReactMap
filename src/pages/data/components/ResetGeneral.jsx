// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'

import {
  resetAllGeneral,
  resetAudio,
  resetIcons,
  resetLocation,
  resetMenus,
  resetSettings,
  resetUI,
  resetUserSettings,
} from '@utils/resetState'

import {
  ButtonWithNotification,
  ChildContainer,
  StyledDivider,
  StyledSubHeader,
} from './Shared'
import { useDataManagementStore } from '../hooks/store'

export function ResetGeneral() {
  const { t } = useTranslation()
  const isHovering = useDataManagementStore((s) => s.resetGeneralHover)

  return (
    <ChildContainer>
      <StyledSubHeader>{t('reset_general_title')}</StyledSubHeader>
      <ButtonWithNotification
        onClick={resetSettings}
        label={t('reset_settings')}
        color="warning.main"
        category="general"
        isHovering={isHovering}
      />
      <ButtonWithNotification
        onClick={resetMenus}
        label={t('reset_menus')}
        color="warning.main"
        category="general"
        isHovering={isHovering}
      />
      <ButtonWithNotification
        onClick={resetUserSettings}
        label={t('reset_options')}
        color="warning.main"
        category="general"
        isHovering={isHovering}
      />
      <ButtonWithNotification
        onClick={resetUI}
        label={t('reset_ui')}
        color="warning.main"
        category="general"
        isHovering={isHovering}
      />
      <ButtonWithNotification
        onClick={resetLocation}
        label={t('reset_position')}
        color="warning.main"
        category="general"
        isHovering={isHovering}
      />
      <StyledDivider />
      <StyledSubHeader>{t('reset_assets')}</StyledSubHeader>
      <ButtonWithNotification
        onClick={resetIcons}
        label={t('reset_icons')}
        color="warning.main"
        category="general"
        isHovering={isHovering}
      />
      <ButtonWithNotification
        onClick={resetAudio}
        label={t('reset_audio')}
        color="warning.main"
        category="general"
        isHovering={isHovering}
      />
      <StyledDivider />
      <ButtonWithNotification
        onClick={resetAllGeneral}
        label={t('reset_all')}
        color="error.main"
        category="general"
        all
        onMouseEnter={() =>
          useDataManagementStore.setState({ resetGeneralHover: true })
        }
        onMouseLeave={() =>
          useDataManagementStore.setState({ resetGeneralHover: false })
        }
      />
    </ChildContainer>
  )
}

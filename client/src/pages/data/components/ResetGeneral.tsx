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

import { useDataManagementStore } from '../hooks/store'

import {
  ButtonWithNotification,
  ChildContainer,
  StyledDivider,
  StyledSubHeader,
} from './Shared'

export function ResetGeneral() {
  const { t } = useTranslation()
  const isHovering = useDataManagementStore((s) => s.resetGeneralHover)

  return (
    <ChildContainer>
      <StyledSubHeader>{t('reset_general_title')}</StyledSubHeader>
      <ButtonWithNotification
        category="general"
        color="warning.main"
        isHovering={isHovering}
        label={t('reset_settings')}
        onClick={resetSettings}
      />
      <ButtonWithNotification
        category="general"
        color="warning.main"
        isHovering={isHovering}
        label={t('reset_menus')}
        onClick={resetMenus}
      />
      <ButtonWithNotification
        category="general"
        color="warning.main"
        isHovering={isHovering}
        label={t('reset_options')}
        onClick={resetUserSettings}
      />
      <ButtonWithNotification
        category="general"
        color="warning.main"
        isHovering={isHovering}
        label={t('reset_ui')}
        onClick={resetUI}
      />
      <ButtonWithNotification
        category="general"
        color="warning.main"
        isHovering={isHovering}
        label={t('reset_position')}
        onClick={resetLocation}
      />
      <StyledDivider />
      <StyledSubHeader>{t('reset_assets')}</StyledSubHeader>
      <ButtonWithNotification
        category="general"
        color="warning.main"
        isHovering={isHovering}
        label={t('reset_icons')}
        onClick={resetIcons}
      />
      <ButtonWithNotification
        category="general"
        color="warning.main"
        isHovering={isHovering}
        label={t('reset_audio')}
        onClick={resetAudio}
      />
      <StyledDivider />
      <ButtonWithNotification
        all
        category="general"
        color="error.main"
        label={t('reset_all')}
        onClick={resetAllGeneral}
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

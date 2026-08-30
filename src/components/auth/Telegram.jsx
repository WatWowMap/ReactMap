// @ts-check
import * as React from 'react'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'

import { I } from '../I'

/**
 * Legacy hash signed Login Widget. Telegram has archived its documentation in
 * favor of the OAuth/OIDC flow, but it still works, so it stays the default for
 * anyone who has not set a `clientId`/`clientSecret` on their strategy.
 *
 * @param {{ botName: string, authUrl: string }} props
 * @returns
 */
export function TelegramWidget({ botName, authUrl }) {
  const ref = React.useRef(null)

  React.useEffect(() => {
    if (ref.current) {
      const script = document.createElement('script')
      script.src = 'https://telegram.org/js/telegram-widget.js?22'
      script.setAttribute('data-telegram-login', botName)
      script.setAttribute('data-auth-url', authUrl)
      script.setAttribute(
        'data-lang',
        localStorage?.getItem('i18nextLng') || 'en',
      )
      script.setAttribute('data-userpic', 'false')
      script.setAttribute('data-size', 'large')
      script.setAttribute('data-request-access', 'write')
      script.async = true

      ref.current.appendChild(script)

      return () => {
        if (ref.current) ref.current.removeChild(script)
      }
    }
  }, [botName, authUrl, ref])

  return <div ref={ref} />
}

/**
 * OAuth/OIDC entry point. Like Discord, the href points at the callback route,
 * which passport redirects away from when there is no `code` in the query.
 *
 * @param {{ children?: string, bgcolor?: string } & import('@mui/material/Button').ButtonProps} props
 * @returns {React.JSX.Element}
 */
export function TelegramButton({
  href = '/auth/telegram/callback',
  children = 'login',
  size = 'large',
  bgcolor = 'telegram.main',
  ...props
}) {
  const { t } = useTranslation()

  return (
    // TODO: Augment Mui Types
    <Button
      variant="contained"
      bgcolor={bgcolor}
      size={size}
      href={href}
      startIcon={<I className="fab fa-telegram" size={size} color="white" />}
      {...props}
    >
      {t(children)}
    </Button>
  )
}

/**
 * Renders whichever Telegram flow the server is configured for.
 *
 * @param {{ botName: string, authUrl: string } & Omit<Parameters<typeof TelegramButton>[0], 'href'>} props
 * @returns
 */
export function TelegramLogin({ botName, authUrl, ...props }) {
  const telegramOAuth = useMemory((s) => s.auth.telegramOAuth)

  return telegramOAuth ? (
    <TelegramButton href={authUrl} {...props} />
  ) : (
    <TelegramWidget botName={botName} authUrl={authUrl} />
  )
}

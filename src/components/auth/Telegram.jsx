// @ts-check
import * as React from 'react'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'

import { I } from '../I'

/**
 * Legacy hash signed Login Widget. Telegram has archived the docs for it in
 * favor of OAuth, but it still works and stays the default for any strategy
 * without OAuth credentials.
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
 * Renders whichever Telegram flow the route in `authUrl` is running. Custom
 * login page blocks resolve `telegramOAuth` per block, since their
 * `telegramAuthUrl` can point at a different strategy than the domain default;
 * everything else falls back to the flow resolved for `customRoutes`.
 *
 * @param {{ botName: string, authUrl: string, telegramOAuth?: boolean } & Omit<Parameters<typeof TelegramButton>[0], 'href'>} props
 * @returns
 */
export function TelegramLogin({ botName, authUrl, telegramOAuth, ...props }) {
  const domainDefault = useMemory((s) => s.auth.telegramOAuth)
  const isOAuth = telegramOAuth ?? domainDefault

  return isOAuth ? (
    <TelegramButton href={authUrl} {...props} />
  ) : (
    <TelegramWidget botName={botName} authUrl={authUrl} />
  )
}

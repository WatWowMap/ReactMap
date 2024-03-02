// @ts-check
import * as React from 'react'

/**
 *
 * @param {{ botName: string, authUrl: string }} props
 * @returns
 */
export default function TelegramWidget({ botName, authUrl }) {
  const ref = React.useRef(null)

  React.useEffect(() => {
    if (ref.current) {
      const script = document.createElement('script')
      script.src = 'https://telegram.org/js/telegram-widget.js?4'
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

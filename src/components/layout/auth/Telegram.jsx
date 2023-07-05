import React, { useRef, useEffect } from 'react'

export default function Telegram({ botName, authUrl }) {
  const ref = useRef(null)

  useEffect(() => {
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
        ref.current.removeChild(script)
      }
    }
  }, [botName, authUrl, ref])

  return <div ref={ref} />
}

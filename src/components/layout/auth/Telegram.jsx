import React from 'react'
import TelegramLoginButton from 'react-telegram-login'

export default function Telegram({ botName, authUrl }) {
  return (
    <TelegramLoginButton
      botName={process.env?.[botName]}
      dataAuthUrl={authUrl || '/auth/telegram/callback'}
      usePic={false}
      lang={localStorage.getItem('i18nextLng')}
    />
  )
}

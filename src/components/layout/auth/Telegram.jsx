import React from 'react'
import TelegramLoginButton from 'react-telegram-login'

export default function Telegram({ botName, authUrl }) {
  return (
    <TelegramLoginButton
      botName={botName}
      dataAuthUrl={authUrl}
      usePic={false}
      lang={localStorage.getItem('i18nextLng')}
    />
  )
}

import React from 'react'
import {
  DialogContent, Typography,
} from '@material-ui/core'
import Header from '../general/Header'
import Footer from '../general/Footer'

export default function Motd({ messages, newMotdIndex, setMotdIndex }) {
  return (
    <>
      <Header titles={['messageOfTheDay']} />
      <DialogContent>
        {messages.map(message => (
          typeof message === 'string' ? (
            <Typography key={message} variant="subtitle1" align="center" style={{ margin: 20 }}>
              {message}
            </Typography>
          ) : (
            <div key={`${message.title}-${message.body}`} style={{ whiteSpace: 'pre-line', margin: 20, textAlign: 'center' }}>
              {message.title && (
                <Typography variant="h6">
                  {message.title}
                </Typography>
              )}
              {message.body && (
                <Typography variant="subtitle1">
                  {message.body}
                </Typography>
              )}
              {message.footer && (
                <Typography variant="caption">
                  {message.footer}
                </Typography>
              )}
            </div>
          )
        ))}
      </DialogContent>
      <Footer options={[{ name: 'close', action: () => setMotdIndex(newMotdIndex), color: 'primary' }]} />
    </>
  )
}

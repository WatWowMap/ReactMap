// @ts-check
import * as React from 'react'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import TextField from '@mui/material/TextField'
import { useMutation } from '@apollo/client'
import { useTranslation } from 'react-i18next'

import { Query } from '@services/queries'
import { useWebhookStore } from '@store/useWebhookStore'
import { useLayoutStore } from '@store/useLayoutStore'

import { Header } from './Header'
import { Footer } from './Footer'

export function NestSubmission() {
  const { id, name } = useLayoutStore((s) => s.nestSubmissions)
  const [newName, setNewName] = React.useState(name)
  const { t } = useTranslation()

  const [submitNestName, { error }] = useMutation(
    Query.nests('nestSubmission'),
    {
      refetchQueries: ['Nests'],
    },
  )

  const handleClose = () =>
    useLayoutStore.setState({
      nestSubmissions: {
        id: 0,
        name: '',
      },
    })

  const handleSubmit = (e) => {
    if (e) e.preventDefault()

    submitNestName({
      variables: {
        id,
        name: newName,
      },
    })
    handleClose()
  }

  React.useEffect(() => {
    if (name !== newName && id) setNewName(name)
  }, [id, name])

  React.useEffect(() => {
    if (error) {
      useWebhookStore.setState({
        alert: {
          open: true,
          severity: 'error',
          message:
            error?.networkError &&
            'statusCode' in error.networkError &&
            error.networkError?.statusCode === 401
              ? t('mutation_auth_error')
              : error.message,
        },
      })
    }
  }, [error])

  return (
    <Dialog open={!!id} onClose={handleClose}>
      <Header titles="nest_submission_menu" action={handleClose} />
      <DialogContent sx={{ mt: 2 }}>
        <form noValidate autoComplete="off" onSubmit={handleSubmit}>
          <TextField
            value={newName}
            onChange={({ target }) => setNewName(target.value)}
          />
        </form>
      </DialogContent>
      <Footer
        options={[
          {
            name: 'reset',
            action: () => setNewName(name),
          },
          {
            name: 'close',
            action: handleClose,
            color: 'error',
          },
          {
            name: 'save',
            action: handleSubmit,
            color: 'secondary',
          },
        ]}
        role="webhook_footer"
      />
    </Dialog>
  )
}

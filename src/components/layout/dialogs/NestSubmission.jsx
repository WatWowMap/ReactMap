import * as React from 'react'
import { Dialog, DialogContent, TextField } from '@mui/material'
import { useMutation } from '@apollo/client'

import Query from '@services/Query'
import { useDialogStore } from '@hooks/useStore'

import Header from '../general/Header'
import Footer from '../general/Footer'

export default function NestSubmission({ id, name }) {
  const open = useDialogStore((s) => s.nestSubmissions)
  const [newName, setNewName] = React.useState(name)

  const [submitNestName] = useMutation(Query.nests('nestSubmission'), {
    refetchQueries: ['Nests'],
  })

  const handleClose = () => useDialogStore.setState({ nestSubmissions: false })

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

  return (
    <Dialog open={open}>
      <Header titles={['nest_submission_menu']} action={handleClose} />
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

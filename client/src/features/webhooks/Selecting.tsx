import Grid from '@mui/material/Unstable_Grid2'
import Fab from '@mui/material/Fab'
import Slide from '@mui/material/Slide'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'
import { SET_PROFILE, ALL_PROFILES } from '@services/queries/webhook'
import { useWebhookStore, setSelected } from '@store/useWebhookStore'

export function Selecting() {
  const { t } = useTranslation()
  const [save] = useMutation(SET_PROFILE, {
    refetchQueries: [ALL_PROFILES],
  })

  const selected = useWebhookStore((s) => s.selected)

  const handleAll = () => {
    const state = useWebhookStore.getState()
    const tracked = state[state.category]

    if (Array.isArray(tracked)) {
      const selectedObj = Object.fromEntries(tracked.map((x) => [x.uid, true]))

      useWebhookStore.setState({ selected: selectedObj })
    }
  }

  const deleteAll = () => {
    const { category } = useWebhookStore.getState()

    save({
      variables: {
        category: `${category}-delete`,
        data: Object.keys(selected).filter((x) => selected[x]),
        status: 'POST',
      },
    })
    setSelected()()
  }

  return (
    <Slide
      mountOnEnter
      unmountOnExit
      direction="up"
      in={Object.values(selected).some(Boolean)}
    >
      <Grid
        container
        alignItems="center"
        bottom={70}
        justifyContent="center"
        left={0}
        mx="auto"
        position="absolute"
        right={0}
        width="100%"
      >
        <Grid sm={2} textAlign="center" xs={3}>
          <Fab
            color="secondary"
            size="small"
            variant="extended"
            onClick={setSelected()}
          >
            <Typography variant="caption">{t('cancel')}</Typography>
          </Fab>
        </Grid>
        <Grid md={2} sm={3} textAlign="center" xs={4}>
          <Fab
            color="secondary"
            size="small"
            variant="extended"
            onClick={handleAll}
          >
            <Typography variant="caption">{t('select_all')}</Typography>
          </Fab>
        </Grid>
        <Grid md={3} sm={4} textAlign="center" xs={5}>
          <Fab
            color="primary"
            size="small"
            variant="extended"
            onClick={deleteAll}
          >
            <Typography variant="caption">{t('delete_all')}</Typography>
          </Fab>
        </Grid>
      </Grid>
    </Slide>
  )
}

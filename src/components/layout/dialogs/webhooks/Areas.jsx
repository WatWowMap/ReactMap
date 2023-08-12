// @ts-check
import * as React from 'react'
import Done from '@mui/icons-material/Done'
import Clear from '@mui/icons-material/Clear'
import { Trans, useTranslation } from 'react-i18next'
import { Grid, Typography, Chip, Button, Divider } from '@mui/material'

import { useStore } from '@hooks/useStore'

import apolloClient from '@services/apollo'
import { setHuman } from '@services/queries/webhook'

import { setModeBtn, useWebhookStore } from './store'

/** @param {string} areaName */
const handleClick = (areaName) => () => {
  const { selectedAreas, data } = useWebhookStore.getState()
  const { selectedWebhook } = useStore.getState()
  areaName = areaName.toLowerCase()
  let newAreas = []
  if (areaName === 'all') {
    newAreas = data.available
  } else if (areaName === 'none') {
    newAreas = []
  } else {
    newAreas = selectedAreas.includes(areaName)
      ? selectedAreas.filter((a) => a !== areaName)
      : [...selectedAreas, areaName]
  }
  apolloClient.mutate({
    mutation: setHuman,
    variables: {
      category: 'setAreas',
      data: newAreas,
      name: selectedWebhook,
      status: 'POST',
    },
  })
  useWebhookStore.setState({ selectedAreas: newAreas })
}

const Areas = () => {
  const { t } = useTranslation()

  const selectedWebhook = useStore((s) => s.selectedWebhook)
  const data = useWebhookStore((s) => s.data[selectedWebhook])
  const selectedAreas = useWebhookStore((s) => s.selectedAreas)

  React.useEffect(() => {
    useWebhookStore.setState({
      groupedAreas: data.areas.features.reduce((groupMap, feature) => {
        const { group, name } = feature.properties
        if (data.available.includes(name)) {
          if (!groupMap[group]) {
            groupMap[group] = []
          }
          groupMap[group].push(feature)
        }
        return groupMap
      }, {}),
    })
  }, [data.areas.features.length])

  // if (data.areas.status !== true) {
  //   return (
  //     <Typography>{`Invalid Area File Received from ${selectedWebhook}`}</Typography>
  //   )
  // }
  return (
    <Grid
      container
      item
      xs={12}
      justifyContent="center"
      alignItems="center"
      spacing={2}
      style={{ height: '100%' }}
    >
      <Grid item xs={6} sm={3}>
        <Typography variant="h6">{t('areas')}</Typography>
      </Grid>
      <Grid
        item
        xs={6}
        sm={3}
        textAlign="center"
        display={{ xs: 'block', sm: 'none' }}
      >
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={setModeBtn('areas')}
        >
          {t('choose_on_map')}
        </Button>
      </Grid>

      <Grid item xs={6} sm={3} style={{ textAlign: 'center' }}>
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={handleClick('none')}
        >
          {t('disable_all')}
        </Button>
      </Grid>
      <Grid item xs={6} sm={3} style={{ textAlign: 'center' }}>
        <Button
          size="small"
          variant="contained"
          color="secondary"
          onClick={handleClick('all')}
        >
          {t('enable_all')}
        </Button>
      </Grid>
      <Grid
        item
        xs={6}
        sm={3}
        textAlign="center"
        display={{ xs: 'none', sm: 'block' }}
      >
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={setModeBtn('areas')}
        >
          {t('choose_on_map')}
        </Button>
      </Grid>
      <AllAreas />
      <Grid
        item
        container
        xs={12}
        alignItems="center"
        justifyContent="center"
      />
      <Grid item xs={12}>
        <Typography variant="h6" align="center">
          <Trans i18nKey="selected_areas" count={selectedAreas.length}>
            {{ amount: selectedAreas.length }}
          </Trans>
        </Typography>
      </Grid>
    </Grid>
  )
}

export default React.memo(Areas, () => true)

const AllAreas = () => {
  const grouped = useWebhookStore((s) => s.groupedAreas)
  return Object.keys(grouped).map((group) => (
    <GroupTile key={group} group={group} />
  ))
}

const GroupTile = ({ group }) => {
  const features = useWebhookStore((s) => s.groupedAreas[group])
  if (features.length === 0) return null
  return (
    <Grid item xs={12} key={group}>
      <Divider style={{ margin: '20px 0' }} />
      <Typography variant="h4" gutterBottom>
        {group}
      </Typography>
      {features.map(({ properties: { name } }) => (
        <MemoAreaChip key={`${group}_${name}`} name={name} />
      ))}
    </Grid>
  )
}

const AreaChip = ({ name }) => {
  const selected = useWebhookStore((s) =>
    s.selectedAreas.includes(name.toLowerCase()),
  )
  return (
    <Chip
      label={name}
      clickable
      variant={selected ? 'filled' : 'outlined'}
      deleteIcon={selected ? <Done /> : <Clear />}
      size="small"
      color={selected ? 'secondary' : 'primary'}
      onClick={handleClick(name)}
      onDelete={handleClick(name)}
      style={{ margin: 3 }}
    />
  )
}

const MemoAreaChip = React.memo(AreaChip, () => true)

import * as React from 'react'
import MoreVert from '@mui/icons-material/MoreVert'
import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'
import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { setDeepStore } from '@store/useStorage'
import { getTimeUntil } from '@utils/getTimeUntil'
import { useAnalytics } from '@hooks/useAnalytics'
import { Navigation } from '@components/popups/Navigation'

const getColor = (timeSince: number) => {
  let color = 'success'

  if (timeSince > 604800) {
    color = '#ffeb3b'
  }
  if (timeSince > 1209600) {
    color = 'error'
  }

  return color
}

export function NestPopup({
  recent,
  iconUrl,
  pokemon_id,
  pokemon_form,
  id,
  name = '',
  updated = 0,
  pokemon_avg = 0,
  submitted_by = '',
  lat,
  lon,
}: import('@rm/types').Nest & {
  recent: boolean
  iconUrl: string
}) {
  const { t } = useTranslation()
  const submissionPerm = useMemory((s) => s.auth.perms.nestSubmissions)

  const [parkName, setParkName] = React.useState(true)
  const [anchorEl, setAnchorEl] = React.useState(null)

  const lastUpdated = getTimeUntil(updated * 1000)

  const handleClick = (event) => setAnchorEl(event.currentTarget)
  const handleClose = () => setAnchorEl(null)
  const handleHide = () => {
    setAnchorEl(null)
    useMemory.setState((prev) => ({ hideList: new Set(prev.hideList).add(id) }))
  }

  const handleExclude = () => {
    setAnchorEl(null)
    const key = `${pokemon_id}-${pokemon_form}`

    setDeepStore(`filters.nests.filter.${key}.enabled`, false)
  }

  useAnalytics('Popup', `Name: ${name} Pokemon: ${pokemon_id}`, 'Nest')

  const options = [
    { name: 'hide', action: handleHide },
    { name: 'exclude', action: handleExclude },
  ]

  return (
    <Grid
      container
      alignItems="center"
      justifyContent="center"
      spacing={1}
      style={{ width: 200 }}
    >
      <Grid textAlign="center" xs={pokemon_id ? 9 : 12}>
        <Typography
          align="center"
          noWrap={parkName}
          variant={name.length > 20 ? 'subtitle2' : 'h6'}
          onClick={() => setParkName(!parkName)}
        >
          {name}
        </Typography>
        {submitted_by && (
          <Typography
            fontSize={10}
            noWrap={parkName}
            variant="caption"
            onClick={() => setParkName(!parkName)}
          >
            {t('submitted_by')}: {submitted_by}
          </Typography>
        )}
      </Grid>
      {!!pokemon_id && (
        <Grid xs={3}>
          <IconButton aria-haspopup="true" size="large" onClick={handleClick}>
            <MoreVert />
          </IconButton>
        </Grid>
      )}
      <Menu
        keepMounted
        PaperProps={{
          style: {
            maxHeight: 216,
            minWidth: '20ch',
          },
        }}
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose}
      >
        {options.map((option) => (
          <MenuItem key={option.name} onClick={option.action}>
            {typeof option.name === 'string' ? t(option.name) : option.name}
          </MenuItem>
        ))}
      </Menu>
      {!!pokemon_id && (
        <Grid textAlign="center" xs={6}>
          <img
            alt={iconUrl}
            src={iconUrl}
            style={{
              maxHeight: 75,
              maxWidth: 75,
            }}
          />
          <br />
          <Typography variant="caption">{t(`poke_${pokemon_id}`)}</Typography>
        </Grid>
      )}
      <Grid textAlign="center" xs={pokemon_id ? 6 : 12}>
        <Typography variant="subtitle2">{t('last_updated')}</Typography>
        <Typography
          color={getColor(lastUpdated.diff)}
          variant={lastUpdated.str.includes('D') ? 'h6' : 'subtitle2'}
        >
          {lastUpdated.str.replace('days', t('days')).replace('day', t('day'))}
        </Typography>
        <Typography variant="subtitle2">
          ~{pokemon_avg?.toFixed(2) || 0} {t('spawns_per_hour')}
        </Typography>
      </Grid>
      <Grid xs={12}>
        <Divider style={{ margin: 4 }} />
      </Grid>
      <Grid textAlign="center" xs={12}>
        {recent ? (
          <Typography variant="caption">
            {t('nest_estimated')}
            <br />
            {t('verify_nests')}
          </Typography>
        ) : (
          <Typography variant="caption">
            {t('nest_out_of_date')}
            <br />
            {t('nest_check_current')}
          </Typography>
        )}
      </Grid>
      {submissionPerm && (
        <Grid textAlign="center" xs={9}>
          <Button
            color="secondary"
            size="small"
            variant="outlined"
            onClick={() =>
              useLayoutStore.setState({
                nestSubmissions: {
                  id: `${id}`,
                  name: `${name}`,
                },
              })
            }
          >
            <Typography variant="caption">{t('submit_nest_name')}</Typography>
          </Button>
        </Grid>
      )}
      <Grid
        container
        alignItems="center"
        justifyContent="center"
        xs={submissionPerm ? 3 : 12}
      >
        <Navigation lat={lat} lon={lon} />
      </Grid>
    </Grid>
  )
}

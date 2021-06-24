import React from 'react'
import {
  Grid,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
} from '@material-ui/core'
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'
import CardMedia from '@material-ui/core/CardMedia'
import { useTranslation } from 'react-i18next'

import useStyles from '@hooks/useStyles'
import { useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'

export default function UserProfile({ setUserProfile }) {
  const classes = useStyles()
  const { t } = useTranslation()
  const { perms } = useStatic(state => state.auth)
  const { map: { excludeList, rolesLinkName, rolesLink } } = useStatic(state => state.config)

  return (
    <>
      <DialogTitle className={classes.filterHeader}>
        {t('userProfile')}
      </DialogTitle>
      <DialogContent>
        <Grid
          container
          direction="row"
          alignItems="center"
          justify="center"
          spacing={2}
        >
          {Object.keys(perms).map(perm => {
            if (excludeList.includes(perm)) {
              return null
            }
            return (
              <Grid item xs={12} sm={6} key={perm}>
                <Card className="perm-wrapper">
                  {!perms[perm] && <div className="disabled-overlay" />}
                  {perm !== 'areaRestrictions' ? (
                    <CardMedia
                      style={{
                        height: 250,
                        border: 'black 4px solid',
                        borderRadius: 4,
                      }}
                      image={`/images/perms/${perm}.png`}
                      title={perm}
                    />
                  ) : (
                    <List
                      style={{
                        height: 235,
                        border: 'black 4px solid',
                        borderRadius: 4,
                      }}
                    >
                      {perms[perm].map(area => (
                        <ListItem key={area}>
                          <Typography>
                            {Utility.getProperName(area)}
                          </Typography>
                        </ListItem>
                      ))}
                    </List>
                  )}
                  <CardContent style={{ height: 100 }}>
                    <Typography gutterBottom variant="h6" noWrap>
                      {t(perm)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" component="p">
                      {t(`${perm}Subtitle`)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button href={rolesLink} target="_blank" rel="noreferrer" color="primary">
          {rolesLinkName}
        </Button>
        <Button onClick={() => setUserProfile(false)} color="secondary">
          {t('close')}
        </Button>
      </DialogActions>
    </>
  )
}

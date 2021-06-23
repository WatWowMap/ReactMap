import React, { useState } from 'react'
import {
  Grid, DialogContent, Typography, Divider,
} from '@material-ui/core'
import { useTranslation, Trans } from 'react-i18next'

import SliderTile from '../filters/SliderTile'
import { filters, sliders } from './data.json'

export default function TutSliders() {
  const { ivOr } = filters.pokemon
  const { t } = useTranslation()
  const [temp, setTemp] = useState({ ...ivOr, iv: [80, 100], great: [1, 10] })
  const fullCheck = {}

  const handleChange = (event, values) => {
    if (values) {
      setTemp({
        ...temp, [event]: values,
      })
    } else {
      const { name, value } = event.target
      setTemp({
        ...temp, [name]: value,
      })
    }
  }

  const arrayCheck = (filter, key) => filter[key].every((v, i) => v === ivOr[key][i])
  Object.keys(temp).forEach(key => fullCheck[key] = !arrayCheck(temp, key))

  const disabled = Object.keys(fullCheck).filter(key => fullCheck[key] === false)
  return (
    <DialogContent>
      <Grid
        container
        direction="row"
        alignItems="center"
        justify="center"
      >
        <Grid item xs={12} style={{ margin: 5 }}>
          <Typography variant="h6" align="center" gutterBottom>
            {t('tutorialSliders0')}
          </Typography>
        </Grid>
        <Grid
          container
          direction="row"
          justify="center"
          alignItems="center"
          style={{ width: 300 }}
        >
          {sliders.map(slider => (
            <Grid item xs={12} key={slider.name}>
              <SliderTile
                filterSlide={slider}
                handleChange={handleChange}
                filterValues={temp}
              />
            </Grid>
          ))}
        </Grid>
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          <Typography variant="h6">
            {t('tutorialSliders1')}
          </Typography>
          {fullCheck.iv && (
            <Typography variant="subtitle2" color="secondary">
              <Trans i18nKey="tutorialSliders2">
                {{ iv0: temp.iv[0] }}
                {{ iv1: temp.iv[1] }}
              </Trans>
            </Typography>
          )}
          {fullCheck.level && (
            <Typography variant="subtitle2" color="secondary">
              <Trans i18nKey={fullCheck.iv ? 'tutorialSliders3alt' : 'tutorialSliders3'}>
                {{ level0: temp.level[0] }}
                {{ level1: temp.level[1] }}
              </Trans>
            </Typography>
          )}
          {fullCheck.great && (
            <Typography variant="subtitle2" color="primary">
              <Trans i18nKey={(fullCheck.iv || fullCheck.level) ? 'tutorialSliders4alt' : 'tutorialSliders4'}>
                {{ gl0: temp.great[0] }}
                {{ gl1: temp.great[1] }}
              </Trans>
            </Typography>
          )}
          {fullCheck.ultra && (
            <Typography variant="subtitle2" color="primary">
              <Trans i18nKey={(fullCheck.iv || fullCheck.level || fullCheck.great) ? 'tutorialSliders5alt' : 'tutorialSliders5'}>
                {{ ul0: temp.ultra[0] }}
                {{ ul1: temp.ultra[1] }}
              </Trans>
            </Typography>
          )}
        </Grid>
        <Grid item xs={12}>
          <Divider light style={{ margin: 10 }} />
        </Grid>
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          <Typography variant="subtitle2" color="secondary">
            {t('tutorialSliders6')}
          </Typography>
          <Typography variant="subtitle2" color="primary">
            {t('tutorialSliders7')}
          </Typography>
          <Typography variant="subtitle2">
            {t('tutorialSliders8')}
          </Typography>
          {disabled.length > 0 && (
            <Typography variant="caption">
              ({disabled.map(each => t(`${each}Slider`)).join(', ')})
            </Typography>
          )}
        </Grid>
      </Grid>
    </DialogContent>
  )
}

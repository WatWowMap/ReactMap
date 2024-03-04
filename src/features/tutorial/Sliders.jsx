import React, { useState } from 'react'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Divider from '@mui/material/Divider'
import { useTranslation, Trans } from 'react-i18next'

import { SliderTile } from '@components/inputs/SliderTile'
import data from './data'

const relevant = ['iv', 'level', 'great', 'ultra']
const { ivOr } = data.filters.pokemon

export default function TutSliders() {
  const { t } = useTranslation()

  const [temp, setTemp] = useState({ ...ivOr, iv: [80, 100], great: [1, 10] })

  const handleChange = (event, values) => {
    if (values) {
      setTemp({
        ...temp,
        [event]: values,
      })
    } else {
      const { name, value } = event.target
      setTemp({
        ...temp,
        [name]: value,
      })
    }
  }
  const fullCheck = {}
  const slidersToUse = data.sliders.filter((slider) =>
    relevant.includes(slider.name),
  )
  const arrayCheck = (filter, key) =>
    filter[key].every((v, i) => v === ivOr[key][i])
  Object.keys(temp).forEach((key) => (fullCheck[key] = !arrayCheck(temp, key)))
  const disabled = Object.keys(fullCheck).filter(
    (key) => fullCheck[key] === false,
  )

  return (
    <DialogContent>
      <Grid
        container
        direction="row"
        alignItems="center"
        justifyContent="center"
        style={{ height: '100%' }}
      >
        <Grid item xs={12} style={{ margin: 5 }}>
          <Typography variant="h6" align="center" gutterBottom>
            {t('tutorial_sliders_0')}
          </Typography>
        </Grid>
        <Grid
          container
          direction="row"
          justifyContent="center"
          alignItems="center"
          style={{ width: 300 }}
        >
          {slidersToUse.map((slider) => (
            <Grid item xs={12} key={slider.name}>
              <SliderTile
                slide={slider}
                handleChange={handleChange}
                values={temp[slider.name]}
              />
            </Grid>
          ))}
        </Grid>
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          <Typography variant="h6">{t('tutorial_sliders_1')}</Typography>
          {fullCheck.iv && (
            <Typography variant="subtitle2" color="secondary">
              <Trans i18nKey="tutorial_sliders_2">
                {{ iv0: temp.iv[0] }}
                {{ iv1: temp.iv[1] }}
              </Trans>
            </Typography>
          )}
          {fullCheck.level && (
            <Typography variant="subtitle2" color="secondary">
              <Trans
                i18nKey={
                  fullCheck.iv ? 'tutorial_sliders_3alt' : 'tutorial_sliders_3'
                }
              >
                {{ level0: temp.level[0] }}
                {{ level1: temp.level[1] }}
              </Trans>
            </Typography>
          )}
          {fullCheck.great && (
            <Typography variant="subtitle2" color="primary">
              <Trans
                i18nKey={
                  fullCheck.iv || fullCheck.level
                    ? 'tutorial_sliders_4alt'
                    : 'tutorial_sliders_4'
                }
              >
                {{ gl0: temp.great[0] }}
                {{ gl1: temp.great[1] }}
              </Trans>
            </Typography>
          )}
          {fullCheck.ultra && (
            <Typography variant="subtitle2" color="primary">
              <Trans
                i18nKey={
                  fullCheck.iv || fullCheck.level || fullCheck.great
                    ? 'tutorial_sliders_5alt'
                    : 'tutorial_sliders_5'
                }
              >
                {{ ul0: temp.ultra[0] }}
                {{ ul1: temp.ultra[1] }}
              </Trans>
            </Typography>
          )}
          {disabled.length === 4 && (
            <Typography variant="caption">{t('tutorial_sliders_9')}</Typography>
          )}
        </Grid>
        <Grid item xs={12}>
          <Divider light style={{ margin: 10 }} />
        </Grid>
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          <Typography variant="subtitle2" color="secondary">
            {t('tutorial_sliders_6')}
          </Typography>
          <Typography variant="subtitle2" color="primary">
            {t('tutorial_sliders_7')}
          </Typography>
          <Typography variant="subtitle2">{t('tutorial_sliders_8')}</Typography>
          {disabled.length && (
            <Typography variant="caption">
              ({disabled.map((each) => t(`slider_${each}`)).join(', ')})
            </Typography>
          )}
        </Grid>
      </Grid>
    </DialogContent>
  )
}

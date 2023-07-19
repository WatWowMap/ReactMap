import React from 'react'
import {
  DialogContent,
  Divider,
  List,
  ListItemText,
  ListItem,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useStatic } from '@hooks/useStore'
import PokemonPopup from '@components/popups/Pokemon'
import data from './data'

export default function TutPopup() {
  const { t } = useTranslation()
  const Icons = useStatic((state) => state.Icons)
  const {
    map: { startLat, startLon },
  } = useStatic((state) => state.config)
  const ts = Math.floor(new Date().getTime() / 1000)

  return (
    <DialogContent>
      <List sx={{ height: '100%' }}>
        <ListItem>
          <ListItemText
            primary={t('tutorial_popup_0')}
            primaryTypographyProps={{ variant: 'h6', align: 'center' }}
          />
        </ListItem>
        <Divider sx={{ my: 2 }} component="li" />
        <ListItem>
          <ListItemText
            primary={t('tutorial_popup_1')}
            primaryTypographyProps={{ variant: 'subtitle1', align: 'center' }}
          />
        </ListItem>
        <ListItem
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="leaflet-popup-content-wrapper" style={{ width: 230 }}>
            <div className="leaflet-popup-content">
              <PokemonPopup
                pokemon={{
                  ...data.pokemon,
                  expire_timestamp: ts + 1800,
                  updated: ts + 100,
                  first_seen_timestamp: ts,
                  lat: startLat,
                  lon: startLon,
                }}
                iconUrl="https://raw.githubusercontent.com/WatWowMap/wwm-uicons-webp/main/pokemon/16.webp"
                userSettings={{ prioritizePvpInfo: false }}
                isTutorial
                Icons={Icons}
              />
            </div>
          </div>
        </ListItem>
        <ListItem>
          <ListItemText
            primary={t('tutorial_popup_2')}
            primaryTypographyProps={{ variant: 'h6', align: 'center' }}
          />
        </ListItem>
        <Divider sx={{ my: 2 }} component="li" />
        <ListItem>
          <ListItemText
            primary={t('tutorial_popup_3')}
            primaryTypographyProps={{ variant: 'subtitle1', align: 'center' }}
          />
        </ListItem>
      </List>
    </DialogContent>
  )
}

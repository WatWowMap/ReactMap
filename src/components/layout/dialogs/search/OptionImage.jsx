// @ts-check
/* eslint-disable react/destructuring-assignment */
import * as React from 'react'
import Box from '@mui/material/Box'

import NameTT from '@components/popups/common/NameTT'
import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'
import getRewardInfo from '@services/functions/getRewardInfo'
import { useTranslateById } from '@hooks/useTranslateById'
import { Img } from '@components/layout/general/Img'

/** @param {Partial<import('@rm/types').Quest>} props */
function QuestImage(props) {
  const { src, amount, tt } = getRewardInfo(props)
  const { Icons } = useMemory.getState()
  return (
    <Box maxHeight={45} maxWidth={45}>
      <NameTT id={tt}>
        <Img
          src={src}
          maxHeight={45}
          maxWidth={45}
          alt={typeof tt === 'string' ? tt : tt.join(' ')}
          onError={(e) => {
            if (e.target instanceof HTMLImageElement) {
              e.target.onerror = null
              e.target.src = Icons.getRewards(0)
            }
          }}
        />
      </NameTT>
      {!!amount && <div className="search-amount-holder">x{amount}</div>}
    </Box>
  )
}

/** @param {{ url: string }} props */
function FortImage({ url }) {
  const { searchTab } = useStorage.getState()
  const { Icons } = useMemory.getState()
  return (
    <Img
      src={
        url.includes('http')
          ? url.replace(/^http:\/\//, 'https://')
          : Icons.getMisc(searchTab)
      }
      onError={(e) => {
        if (e.target instanceof HTMLImageElement) {
          e.target.onerror = null
          e.target.src =
            searchTab === 'pokestops' ? Icons.getPokestops(0) : Icons.getGyms(0)
        }
      }}
      alt={url}
      height={45}
      width={45}
    />
  )
}

/** @param {Partial<import('@rm/types').Pokemon>} props */
function PokemonImage({ pokemon_id, form, gender, costume, shiny }) {
  const { Icons } = useMemory.getState()
  const { t } = useTranslateById()
  return (
    <NameTT id={[form ? `form_${form}` : '', `poke_${pokemon_id}`]}>
      <Img
        src={Icons.getPokemon(pokemon_id, form, 0, gender, costume, 0, shiny)}
        alt={t(`${pokemon_id}-${form}`)}
        maxHeight={45}
        maxWidth={45}
      />
    </NameTT>
  )
}

/** @param {Partial<import('@rm/types').Gym>} props */
function RaidImage({
  raid_pokemon_id,
  raid_pokemon_form,
  raid_pokemon_gender,
  raid_pokemon_costume,
  raid_pokemon_evolution,
  raid_pokemon_alignment,
}) {
  const { Icons } = useMemory.getState()
  const { t } = useTranslateById()
  return (
    <NameTT
      id={[
        raid_pokemon_form ? `form_${raid_pokemon_form}` : '',
        raid_pokemon_evolution ? `evo_${raid_pokemon_evolution}` : '',
        `poke_${raid_pokemon_id}`,
      ]}
    >
      <Img
        src={Icons.getPokemon(
          raid_pokemon_id,
          raid_pokemon_form,
          raid_pokemon_evolution,
          raid_pokemon_gender,
          raid_pokemon_costume,
          raid_pokemon_alignment,
        )}
        alt={t(`${raid_pokemon_id}-${raid_pokemon_form}`)}
        maxHeight={45}
        maxWidth={45}
      />
    </NameTT>
  )
}

/** @param {Partial<import('@rm/types').Pokestop>} props */
function LureImage({ lure_id }) {
  const { Icons } = useMemory.getState()
  const { t } = useTranslateById()
  return (
    <NameTT id={`lure_${lure_id}`}>
      <Img
        src={Icons.getPokestops(lure_id)}
        alt={t(`lure_${lure_id}`)}
        maxHeight={45}
        maxWidth={45}
      />
    </NameTT>
  )
}

/** @param {{ nest_pokemon_id: number, nest_pokemon_form?: number }} props */
function NestImage({ nest_pokemon_id, nest_pokemon_form }) {
  const { Icons } = useMemory.getState()
  const { t } = useTranslateById()
  return (
    <NameTT
      id={[
        nest_pokemon_form ? `form_${nest_pokemon_form}` : '',
        `poke_${nest_pokemon_id}`,
      ]}
    >
      <Img
        src={Icons.getPokemon(nest_pokemon_id, nest_pokemon_form)}
        alt={t(`${nest_pokemon_id}-${nest_pokemon_form || 0}`)}
        maxHeight={45}
        maxWidth={45}
      />
    </NameTT>
  )
}

function Misc() {
  const { searchTab } = useStorage.getState()
  const miscIcon = useMemory((s) => s.Icons.getMisc(searchTab))
  return <Img src={miscIcon} alt={searchTab} maxHeight={45} maxWidth={45} />
}

/** @param {Partial<import('@rm/types').Quest & { id: string }> | { id: string, url?: string } | Partial<import('@rm/types').Pokemon> | Partial<import('@rm/types').Gym> | Partial<import('@rm/types').Pokestop> | { id: string, nest_pokemon_id: number, nest_pokemon_form?: number }} props */
function OptionImage(props) {
  if ('url' in props && props.url) return <FortImage url={props.url} />
  if ('quest_reward_type' in props) return <QuestImage {...props} />
  if ('pokemon_id' in props) return <PokemonImage {...props} />
  if ('raid_pokemon_id' in props) return <RaidImage {...props} />
  if ('lure_id' in props) return <LureImage {...props} />
  if ('nest_pokemon_id' in props) return <NestImage {...props} />
  return <Misc />
}

export const OptionImageMemo = React.memo(
  OptionImage,
  (prev, next) => prev.id === next.id,
)

import * as React from 'react'
import Box from '@mui/material/Box'
import { NameTT } from '@components/popups/NameTT'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { getRewardInfo } from '@utils/getRewardInfo'
import { useTranslateById } from '@hooks/useTranslateById'
import { Img } from '@components/Img'

function QuestImage(props: Partial<import('@rm/types').Quest>) {
  const { src, amount, tt } = getRewardInfo(props)
  const { Icons } = useMemory.getState()

  return (
    <Box maxHeight={45} maxWidth={45}>
      <NameTT title={tt}>
        <Img
          alt={typeof tt === 'string' ? tt : tt.join(' ')}
          maxHeight={45}
          maxWidth={45}
          src={src}
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

function FortImage({ url }: { url: string }) {
  const { searchTab } = useStorage.getState()
  const { Icons } = useMemory.getState()

  return (
    <Img
      alt={url}
      height={45}
      src={
        url.includes('http')
          ? url.replace(/^http:\/\//, 'https://')
          : Icons.getMisc(searchTab)
      }
      width={45}
      onError={(e) => {
        if (e.target instanceof HTMLImageElement) {
          e.target.onerror = null
          e.target.src =
            searchTab === 'pokestops' ? Icons.getPokestops(0) : Icons.getGyms(0)
        }
      }}
    />
  )
}

function PokemonImage({
  pokemon_id,
  form,
  gender,
  costume,
  shiny,
  bread,
}: Partial<import('@rm/types').Pokemon> & { bread?: number }) {
  const { Icons } = useMemory.getState()
  const { t } = useTranslateById()

  return (
    <NameTT title={[form ? `form_${form}` : '', `poke_${pokemon_id}`]}>
      <Img
        alt={t(`${pokemon_id}-${form}`)}
        maxHeight={45}
        maxWidth={45}
        src={Icons.getPokemon(
          pokemon_id,
          form,
          0,
          gender,
          costume,
          0,
          shiny,
          bread,
        )}
      />
    </NameTT>
  )
}

function RaidImage({
  raid_pokemon_id,
  raid_pokemon_form,
  raid_pokemon_gender,
  raid_pokemon_costume,
  raid_pokemon_evolution,
  raid_pokemon_alignment,
}: Partial<import('@rm/types').Gym>) {
  const { Icons } = useMemory.getState()
  const { t } = useTranslateById()

  return (
    <NameTT
      title={[
        raid_pokemon_form ? `form_${raid_pokemon_form}` : '',
        raid_pokemon_evolution ? `evo_${raid_pokemon_evolution}` : '',
        `poke_${raid_pokemon_id}`,
      ]}
    >
      <Img
        alt={t(`${raid_pokemon_id}-${raid_pokemon_form}`)}
        maxHeight={45}
        maxWidth={45}
        src={Icons.getPokemon(
          raid_pokemon_id,
          raid_pokemon_form,
          raid_pokemon_evolution,
          raid_pokemon_gender,
          raid_pokemon_costume,
          raid_pokemon_alignment,
        )}
      />
    </NameTT>
  )
}

function LureImage({ lure_id }: Partial<import('@rm/types').Pokestop>) {
  const { Icons } = useMemory.getState()
  const { t } = useTranslateById()

  return (
    <NameTT title={`lure_${lure_id}`}>
      <Img
        alt={t(`lure_${lure_id}`)}
        maxHeight={45}
        maxWidth={45}
        src={Icons.getPokestops(lure_id)}
      />
    </NameTT>
  )
}

function NestImage({
  nest_pokemon_id,
  nest_pokemon_form,
}: {
  nest_pokemon_id: number
  nest_pokemon_form?: number
}) {
  const { Icons } = useMemory.getState()
  const { t } = useTranslateById()

  return (
    <NameTT
      title={[
        nest_pokemon_form ? `form_${nest_pokemon_form}` : '',
        `poke_${nest_pokemon_id}`,
      ]}
    >
      <Img
        alt={t(`${nest_pokemon_id}-${nest_pokemon_form || 0}`)}
        maxHeight={45}
        maxWidth={45}
        src={Icons.getPokemon(nest_pokemon_id, nest_pokemon_form)}
      />
    </NameTT>
  )
}

function InvasionImage({
  grunt_type,
  confirmed,
}: Partial<import('@rm/types').Invasion>) {
  const { Icons } = useMemory.getState()
  const { t } = useTranslateById()

  return (
    <NameTT title={`grunt_${grunt_type}`}>
      <Img
        alt={t(`grunt_${grunt_type}`)}
        maxHeight={45}
        maxWidth={45}
        src={Icons.getInvasions(grunt_type, confirmed)}
      />
    </NameTT>
  )
}

function Misc() {
  const { searchTab } = useStorage.getState()
  const miscIcon = useMemory((s) =>
    searchTab === 'stations'
      ? s.Icons.getStation()
      : s.Icons.getMisc(searchTab),
  )

  return <Img alt={searchTab} maxHeight={45} maxWidth={45} src={miscIcon} />
}

function OptionImage(
  props:
    | Partial<import('@rm/types').Quest & { id: string }>
    | { id: string; url?: string }
    | Partial<import('@rm/types').Pokemon>
    | Partial<import('@rm/types').Gym>
    | Partial<import('@rm/types').Pokestop>
    | { id: string; nest_pokemon_id: number; nest_pokemon_form?: number }
    | (Partial<import('@rm/types').Invasion> & { id: string })
    | Partial<import('@rm/types').Station>,
) {
  if ('url' in props && props.url) return <FortImage url={props.url} />
  if ('quest_reward_type' in props) return <QuestImage {...props} />
  if ('pokemon_id' in props) return <PokemonImage {...props} />
  if ('raid_pokemon_id' in props) return <RaidImage {...props} />
  if ('lure_id' in props) return <LureImage {...props} />
  if ('nest_pokemon_id' in props) return <NestImage {...props} />
  if ('grunt_type' in props) return <InvasionImage {...props} />
  if ('battle_pokemon_id' in props && props.battle_pokemon_id)
    return (
      <PokemonImage
        bread={props.battle_pokemon_bread_mode}
        costume={props.battle_pokemon_costume}
        form={props.battle_pokemon_form}
        gender={props.battle_pokemon_gender}
        pokemon_id={props.battle_pokemon_id}
      />
    )

  return <Misc />
}

export const OptionImageMemo = React.memo(
  OptionImage,
  (prev, next) => prev.id === next.id,
)

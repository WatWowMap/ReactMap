// @ts-check
import * as React from 'react'
import Done from '@mui/icons-material/Done'
import Clear from '@mui/icons-material/Clear'
import Chip from '@mui/material/Chip'
import apolloClient from '@services/apollo'
import { WEBHOOK_AREAS, setHuman } from '@services/queries/webhook'

import { useWebhookStore } from '../../store'

/** @param {string} areaName @param {string} [groupName] */
export const handleClick =
  (areaName, groupName = '') =>
  async () => {
    /** @type {{ group: string, children: string[] }[]} */
    const areas =
      apolloClient.cache.readQuery({
        query: WEBHOOK_AREAS,
      }).webhookAreas || []
    const incomingArea = areaName.toLowerCase()
    const { human } = useWebhookStore.getState()
    const existing = human.area || []
    const foundGroup = areas.find((group) => group.group === groupName) || {
      children: [],
      group: '',
    }
    let newAreas = []
    if (incomingArea === 'all') {
      newAreas = groupName
        ? [
            ...existing,
            ...(areas.find((group) => group.group === groupName)?.children ||
              []),
          ]
        : areas.flatMap((group) => group.children)
    } else if (incomingArea === 'none') {
      newAreas = groupName
        ? existing.filter((a) => !foundGroup.children.includes(a))
        : []
    } else {
      newAreas = existing.includes(incomingArea)
        ? existing.filter((a) => a !== incomingArea)
        : [...existing, incomingArea]
    }
    newAreas = [...new Set(newAreas)]
    await apolloClient
      .mutate({
        mutation: setHuman,
        variables: {
          category: 'setAreas',
          data: newAreas,
          status: 'POST',
        },
      })
      .then(({ data }) => {
        if (data?.webhook?.human) {
          useWebhookStore.setState({ human: data.webhook.human })
        }
      })
    return newAreas
  }

const ICON = {
  true: <Done />,
  false: <Clear />,
}

const AreaChip = ({ name }) => {
  const selected = useWebhookStore((s) =>
    s.human.area.includes(name.toLowerCase()),
  )
  return (
    <Chip
      label={name}
      clickable
      variant={selected ? 'filled' : 'outlined'}
      deleteIcon={ICON[selected]}
      size="small"
      color={selected ? 'secondary' : 'primary'}
      onClick={handleClick(name)}
      onDelete={handleClick(name)}
      style={{ margin: 3 }}
    />
  )
}

export const MemoAreaChip = React.memo(
  AreaChip,
  (prev, next) => prev.name === next.name,
)

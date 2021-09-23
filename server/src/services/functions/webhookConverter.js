module.exports = function webhookConverter(category, data) {
  const converted = {
    distance: data.distance,
    clean: data.clean,
  }
  switch (category) {
    case 'gym':
      Object.assign(converted, {
        gym_id: data.id,
        team: data.team_id,
        slots_available: data.available_slots,
        in_battle: data.in_battle,
      }); break
    case 'egg':
      Object.assign(converted, {
        level: data.raid_level,
      }); break
    case 'raid':
      Object.assign(converted, {
        level: data.raid_level,
        pokemon_id: data.raid_pokemon_id,
        form: data.raid_pokemon_form,
        evolution: data.raid_pokemon_evolution,
      }); break
    default: break
  }
  return converted
}

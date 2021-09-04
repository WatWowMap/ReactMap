module.exports = function webhookConverter(category, data) {
  switch (category) {
    case 'gym':
      return {
        ...data,
        gym_id: data.id,
        gym_name: data.name || 'Unknown',
        latitude: data.lat,
        longitude: data.lon,
        last_modified: data.last_modified_timestamp,
        guard_pokemon_id: data.guarding_pokemon_id,
        slots_available: data.available_slots,
        raid_active_until: data.raid_end_timestamp,
        sponsor_id: data.sponsor_id,
      }
    default: break
  }
}

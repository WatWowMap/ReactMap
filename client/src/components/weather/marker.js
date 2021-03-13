export default function (weather) {
  const lastUpdatedHour = (new Date(weather.updated * 1000)).getHours()
  const currentHour = (new Date).getHours()

  return {
    color: currentHour === lastUpdatedHour ? 'green' : 'red',
    fillColor: currentHour === lastUpdatedHour ? 'blue' : 'red',
    fillOpacity: 0.25,  
  }
}
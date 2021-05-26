export default function typeStyle(cell, tileStyle) {
  const color = tileStyle === 'dark' ? 'red' : 'black'
  if ((cell.count === 1 && cell.count_gyms < 1)
  || (cell.count === 5 && cell.count_gyms < 2)
  || (cell.count === 19 && cell.count_gyms < 3)) {
    return {
      fillColor: 'red', color, opacity: 0.75, fillOpacity: 0.5, weight: 0.75,
    };
  }
  if ((cell.count === 4 && cell.count_gyms < 2) || (cell.count === 18 && cell.count_gyms < 3)) {
    return {
      fillColor: 'orange', color, opacity: 0.75, fillOpacity: 0.5, weight: 0.75,
    };
  }
  if (cell.count >= 20) {
    return {
      fillColor: 'black', color, opacity: 0.75, fillOpacity: 0.25, weight: 0.8,
    };
  }
  return {
    fillColor: 'blue', color, opacity: 0.75, fillOpacity: 0.0, weight: 0.8,
  };
}

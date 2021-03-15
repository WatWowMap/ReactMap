export default function (cell) {
  if ((cell.count === 1 && cell.count_gyms < 1) || (cell.count === 5 && cell.count_gyms < 2) || (cell.count === 19 && cell.count_gyms < 3)) {
    return { fillColor: 'red', color: 'red', opacity: 0.75, fillOpacity: 0.5, weight: 0.75 };
  } else if ((cell.count === 4 && cell.count_gyms < 2) || (cell.count === 18 && cell.count_gyms < 3)) {
    return { fillColor: 'orange', color: 'red', opacity: 0.75, fillOpacity: 0.5, weight: 0.75 };
  } else if (cell.count >= 20) {
    return { fillColor: 'black', color: 'black', opacity: 0.75, fillOpacity: 0.25, weight: 0.8 };
  } else {
    return { fillColor: 'blue', color: 'black', opacity: 0.75, fillOpacity: 0.0, weight: 0.8 };
  }
}
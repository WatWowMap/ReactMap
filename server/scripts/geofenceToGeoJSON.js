/**
* Credits: https://gist.github.com/moriakaice
* Editor: PJ0tterr
* Date: 15-01-2022
*/

const fs = require('fs');
const path = require('path');

// Set Path where for area.json
const configFolder = path.resolve(__dirname, '../../src/configs')
const geofencesFolder = path.resolve(__dirname, '../../public/geofence/geofence.json')

if (!fs.existsSync(geofencesFolder)) {
  // eslint-disable-next-line no-console
  console.error('Error: Geofence directory does not exist:', geofencesFolder);
  return;
}

const geoJSON = {
  type: 'FeatureCollection',
  features: [],
};

fs.readdir(geofencesFolder, (err, files) => {
  if (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return;
  }
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < files.length; i++) {
    const file = path.resolve(geofencesFolder, files[i]);
    // eslint-disable-next-line no-shadow
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        return;
      }
      // eslint-disable-next-line no-console
      console.log('Converting ini geofence file to geoJSON format', file);
      const fences = data.match(/\[([^\]]+)\]([^[]*)/g);
      fences.forEach(fence => {
        const geofence = { type: 'Feature',
          properties: {
            name: '',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[]],
          } };
        // eslint-disable-next-line prefer-destructuring
        geofence.properties.name = fence.match(/\[([^\]]+)\]/)[1];
        geofence.geometry.coordinates[0] = fence.match(/[0-9\-.]+,\s*[0-9\-.]+/g).map(point => [parseFloat(point.split(',')[1]), parseFloat(point.split(',')[0])]);
        geofence.geometry.coordinates[0].push(geofence.geometry.coordinates[0][0]);

        geoJSON.features.push(geofence);
      });
      fs.writeFile(
        path.resolve(configFolder, 'areas.json'),
        JSON.stringify(geoJSON, null, 2),
        'utf8',
        () => { },
      );
      // eslint-disable-next-line no-console
      console.log('areas.json file saved');
    });
  }
});

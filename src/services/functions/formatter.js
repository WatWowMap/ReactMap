export default function formatter(addressFormat, result) {
  return addressFormat
    .replace('{{streetNumber}}', result.streetNumber || '')
    .replace('{{streetName}}', result.streetName || '')
    .replace('{{city}}', result.city || '')
    .replace('{{state}}', result.state || '')
    .replace('{{country}}', result.country || '')
    .replace('{{zipcode}}', result.zipcode || '')
    .replace('{{latitude}}', result.latitude || '')
    .replace('{{longitude}}', result.longitude || '')
    .replace('{{countryCode}}', result.countryCode || '')
    .replace('{{neighborhoods}}', result.neighborhoods || '')
    .replace('{{suburb}}', result.suburb || '')
}

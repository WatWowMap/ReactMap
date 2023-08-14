export default function formatter(addressFormat, result) {
  return addressFormat
    .replace(
      /{{(streetNumber|streetName|city|state|country|zipcode|latitude|longitude|countryCode|neighborhoods|suburb|town|village)}}/g,
      (_, p1) => result[p1] || '',
    )
    .trim()
    .replace(/^,|,$/g, '')
    .trim()
}

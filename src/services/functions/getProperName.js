export default function getProperName(word) {
  const capital = `${word.charAt(0).toUpperCase()}${word.slice(1)}`
  return capital.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
}

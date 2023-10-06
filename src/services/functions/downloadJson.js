// @ts-check

/**
 * @param {object} json
 * @param {`${string}.json`} fileName
 */
export function downloadJson(json, fileName) {
  const el = document.createElement('a')
  el.setAttribute(
    'href',
    `data:application/json;chartset=utf-8,${encodeURIComponent(json)}`,
  )
  el.setAttribute('download', fileName)
  el.style.display = 'none'
  document.body.appendChild(el)
  el.click()
  document.body.removeChild(el)
}

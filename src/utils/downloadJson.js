// @ts-check

/**
 * @param {object} json
 * @param {`${string}.json`} fileName
 */
export function downloadJson(json, fileName) {
  if (json) {
    const el = document.createElement('a')
    el.setAttribute(
      'href',
      `data:application/json;charset=utf-8,${encodeURIComponent(
        typeof json === 'string' ? json : JSON.stringify(json, null, 2),
      )}`,
    )
    el.setAttribute('download', fileName)
    el.style.display = 'none'
    document.body.appendChild(el)
    el.click()
    document.body.removeChild(el)
  }
}

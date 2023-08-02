/**
 * Sets the non-reactive loading element's inner text
 * @param {string} text
 */
export function setLoadingText(text) {
  const loadingText = document.getElementById('loading-text')
  if (loadingText) loadingText.innerText = text
}

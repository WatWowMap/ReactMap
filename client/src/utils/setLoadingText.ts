export function setLoadingText(text: string) {
  const loadingText = document.getElementById('loading-text')

  if (loadingText) loadingText.innerText = text
}

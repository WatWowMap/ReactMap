// @ts-check

try {
  const localState = window?.localStorage?.getItem('local-state')
  if (localState) {
    const { state } = JSON.parse(localState)
    if (state.darkMode) {
      document.body.classList.add('dark')
    }
  }

  const locales = {
    de: 'Map wird geladen',
    en: 'Loading Map',
    es: 'Cargando Mapa',
    fr: 'Chargement de la Map',
    it: 'Caricamento Mappa',
    ja: 'マップを読み込み中',
    ko: '맵 로딩 중',
    nl: 'Map word geladen',
    pl: 'Ładowanie mapy',
    'pt-br': 'Carregando Mapa',
    ru: 'Загрузка карты',
    sv: 'Laddar karta',
    th: 'กำลังโหลดแผนที่',
    tr: 'Harita yükleniyor',
    'zh-tw': '載入地圖中',
  }
  const locale = window?.localStorage?.getItem('i18nextLng') || 'en'
  const element = document.getElementById('loading-text')
  if (element) {
    element.innerText = locales[locale.toLowerCase()] || locales.en
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.error('error with loading locales script', e)
}

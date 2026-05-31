function applyLang(lang) {
  document.documentElement.classList.remove('lang-fr', 'lang-en');
  document.documentElement.classList.add('lang-' + lang);
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = lang === 'fr' ? 'EN' : 'FR';
  localStorage.setItem('lang', lang);
}

function toggleLang() {
  const isFr = document.documentElement.classList.contains('lang-fr');
  applyLang(isFr ? 'en' : 'fr');
}

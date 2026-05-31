const STORAGE_KEY = 'lang';
const DEFAULT_LANG = navigator.language.startsWith('fr') ? 'fr' : 'en';

function applyLang(lang) {
  document.documentElement.setAttribute('data-lang', lang);
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = lang === 'fr' ? 'EN' : 'FR';
  localStorage.setItem(STORAGE_KEY, lang);
}

function toggleLang() {
  const current = document.documentElement.getAttribute('data-lang') || DEFAULT_LANG;
  applyLang(current === 'fr' ? 'en' : 'fr');
}

(function () {
  const saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  applyLang(saved);
})();

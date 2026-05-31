function applyLang(lang) {
  document.documentElement.classList.remove('lang-fr', 'lang-en');
  document.documentElement.classList.add('lang-' + lang);
  var btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = lang === 'fr' ? 'EN' : 'FR';
  localStorage.setItem('lang', lang);
}

function toggleLang() {
  applyLang(localStorage.getItem('lang') === 'fr' ? 'en' : 'fr');
}

document.addEventListener('DOMContentLoaded', function () {
  var saved = localStorage.getItem('lang') || (navigator.language.startsWith('fr') ? 'fr' : 'en');
  applyLang(saved);
});

function applyLang(lang) {
  document.querySelectorAll('.fr').forEach(function(el) { el.hidden = (lang === 'en'); });
  document.querySelectorAll('.en').forEach(function(el) { el.hidden = (lang === 'fr'); });
  var btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = lang === 'fr' ? 'EN' : 'FR';
  localStorage.setItem('lang', lang);
}

function toggleLang() {
  applyLang(localStorage.getItem('lang') === 'fr' ? 'en' : 'fr');
}

document.addEventListener('DOMContentLoaded', function() {
  var saved = localStorage.getItem('lang') || (navigator.language.startsWith('fr') ? 'fr' : 'en');
  applyLang(saved);
});

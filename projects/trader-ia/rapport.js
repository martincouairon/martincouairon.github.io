/* Trader IA — rendu du rapport et du registre des décisions.
   Tout chiffre affiché vient de trader-ia/donnees.json (schéma trader-ia/1), produit
   par tools/publication.py dans le dépôt de l'expérience. Aucun chiffre n'est écrit
   à la main dans la page. */
(function () {
  'use strict';

  var C = {
    mesure: '#2a78d6', declare: '#eb6834', indice: '#1baf7a', s4: '#eda100', s5: '#e87ba4',
    s6: '#008300', s7: '#6250d6', s8: '#e34948', neutre: '#9a9a9a', grille: '#efefec', texte: '#6b6b6b'
  };
  var ORDRE = [C.mesure, C.declare, C.indice, C.s4, C.s5, C.s6, C.s7, C.s8];
  var ATTENTE = 'En attente des premières données. La première décision est fixée au 24 novembre 2026 ; ' +
    'la mesure indépendante suit d’une séance.';

  // ------------------------------------------------------------------ formats
  var nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function vide(v) { return v === null || v === undefined || (typeof v === 'number' && isNaN(v)); }
  function eur(v) { return vide(v) ? '—' : nf0.format(v) + ' €'; }
  function eurS(v) { return vide(v) ? '—' : (v > 0 ? '+' : '') + nf0.format(v) + ' €'; }
  function pct(v, signe) { return vide(v) ? '—' : (signe && v > 0 ? '+' : '') + nf1.format(v) + ' %'; }
  function dec(v, n) { return vide(v) ? '—' : (n === 0 ? nf0 : n === 1 ? nf1 : nf2).format(v); }
  function dateFr(d) {
    if (!d) return '—';
    var p = d.split('-');
    var mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return (+p[2]) + ' ' + mois[+p[1] - 1] + ' ' + p[0];
  }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }
  function fixer(id, html) { var el = $(id); if (el) el.innerHTML = html; }

  // ------------------------------------------------------------------ graphiques
  function attente(id, message) {
    var el = $(id);
    if (!el) return;
    el.innerHTML = '<div class="attente">' + esc(message || ATTENTE) + '</div>';
  }
  function canvas(id) {
    var el = $(id);
    if (!el) return null;
    el.innerHTML = '<canvas></canvas>';
    return el.firstChild;
  }
  var graphes = {};
  function tracer(id, config) {
    if (!window.Chart) { attente(id, 'Bibliothèque graphique indisponible.'); return; }
    if (graphes[id]) graphes[id].destroy();
    var cv = canvas(id);
    if (!cv) return;
    config.options = Object.assign({
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false } },
      elements: { point: { radius: 0, hoverRadius: 4 }, line: { borderWidth: 2, tension: 0 } }
    }, config.options || {});
    graphes[id] = new window.Chart(cv, config);
  }
  function axes(formatY, empile, extra) {
    return Object.assign({
      x: { stacked: !!empile, grid: { display: false }, ticks: { color: C.texte, maxTicksLimit: 7, maxRotation: 0, font: { size: 11 } } },
      y: { stacked: !!empile, grid: { color: C.grille }, border: { display: false },
           ticks: { color: C.texte, font: { size: 11 }, callback: formatY } }
    }, extra || {});
  }
  function legende(id, items) {
    fixer(id, items.map(function (it) {
      return '<span><i class="' + (it.tirets ? 'tirets' : '') + '" style="background:' + it.couleur + ';color:' + it.couleur + '"></i>' + esc(it.nom) + '</span>';
    }).join(''));
  }
  function tooltipEur() {
    return { callbacks: { label: function (c) { return c.dataset.label + ' : ' + eur(c.parsed.y); } } };
  }
  function base100(v) {
    var b = null;
    return v.map(function (x) { if (vide(x)) return null; if (b === null) b = x; return 100 * x / b; });
  }
  function libelles(dates) { return dates.map(function (d) { return d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(2, 4); }); }

  // ------------------------------------------------------------------ rapport
  function enTete(D) {
    var v = D.verificateur || {};
    var etat = v.ok === true ? 'ok' : v.ok === false ? 'echec' : '';
    var n = D.series.dates.length;
    fixer('meta-rapport',
      '<span>Données arrêtées au <b>' + (D.arret_des_donnees ? dateFr(D.arret_des_donnees) : 'aucune donnée') + '</b></span>' +
      '<span>Jeu de données généré le <b>' + dateFr((D.genere_le || '').slice(0, 10)) + '</b></span>' +
      '<span>Séances mesurées <b>' + n + '</b> sur ~252</span>' +
      '<span class="pastille ' + etat + '">Vérificateur : ' + esc(v.texte || 'non exécuté') + '</span>');
  }

  function tuiles(D) {
    var s = D.series, n = s.dates.length, fin = n - 1;
    var t = [];
    var pm = D.profils.mesure || {}, pi = D.profils.iwda || {};
    t.push(['Capitaux propres, mesurés indépendamment', n ? eur(s.mesure[fin]) : '—', 'départ : 120 000 €']);
    t.push(['Rendement net de frais', pct(pm.rendement_pct, true), 'MSCI World (IWDA) : ' + pct(pi.rendement_pct, true)]);
    var dv = D.divergence;
    t.push(['Écart déclaré − mesuré (B5)', dv ? eurS(dv.divergence_eur) : '—',
      dv ? 'soit ' + pct(dv.divergence_pct_des_capitaux_mesures, true) + ' des capitaux mesurés' : 'déclaré − mesuré, net d’impôt']);
    var c = D.couts;
    t.push(['Frais et impôt, mesurés', c ? eur(c.total_mesure_eur) : '—', c ? dec(c.total_points * 100, 0) + ' pb de rendement' : 'courtage, change, glissement, portage, PFU']);
    var k = D.concentration || {};
    t.push(['Concentration', vide(k.nb_effectif_lignes) ? '—' : dec(k.nb_effectif_lignes, 1) + ' lignes',
      'nombre effectif (1/HHI) · levier ' + (vide(k.levier_brut) ? '—' : dec(k.levier_brut, 2) + '×')]);
    fixer('tuiles', t.map(function (x) {
      return '<div class="tuile"><div class="etiquette">' + x[0] + '</div><div class="valeur">' + x[1] +
        '</div><div class="contexte">' + x[2] + '</div></div>';
    }).join(''));
  }

  function figAuto(D) {
    var s = D.series;
    if (!s.dates.length || !s.declare.some(function (v) { return !vide(v); })) {
      attente('fig-auto'); attente('fig-decomp'); return;
    }
    legende('leg-auto', [{ nom: 'Mesuré indépendamment', couleur: C.mesure }, { nom: 'Déclaré par le trader', couleur: C.declare, tirets: true }]);
    tracer('fig-auto', {
      type: 'line',
      data: { labels: libelles(s.dates), datasets: [
        { label: 'Mesuré indépendamment', data: s.mesure, borderColor: C.mesure },
        { label: 'Déclaré par le trader', data: s.declare, borderColor: C.declare, borderDash: [6, 3],
          fill: { target: 0 }, backgroundColor: 'rgba(235,104,52,0.12)' }
      ] },
      options: { scales: axes(function (v) { return nf0.format(v / 1000) + ' k€'; }), plugins: { legend: { display: false }, tooltip: tooltipEur() } }
    });
    var cles = [['D1', 'D1 · exécution', C.s7], ['D2', 'D2 · valorisation', C.indice], ['D3', 'D3 · coûts omis', C.s4], ['D4', 'D4 · arithmétique', C.neutre]];
    legende('leg-decomp', cles.map(function (k) { return { nom: k[1], couleur: k[2] }; }));
    tracer('fig-decomp', {
      type: 'bar',
      data: { labels: libelles(s.dates), datasets: cles.map(function (k) {
        return { label: k[1], data: s[k[0]], backgroundColor: k[2], borderRadius: 2, borderSkipped: false, barPercentage: 0.9, categoryPercentage: 1 };
      }) },
      options: { scales: axes(function (v) { return nf0.format(v) + ' €'; }, true), plugins: { legend: { display: false }, tooltip: tooltipEur() } }
    });
    var dv = D.divergence;
    if (dv) {
      var d3 = dv.D3_detail || {};
      fixer('tab-decomp', table(['Source', 'Ce qu’elle isole', '€'], [
        ['<b>D1</b> hypothèses d’exécution', 'prix de remplissage supposés contre prix conventionnel', n(eurS(dv.D1_hypotheses_execution_eur))],
        ['<b>D2</b> valorisation', 'marques du trader contre marques du mesureur' + (dv.D2_methode ? ' <span class="etiq">' + esc(dv.D2_methode) + '</span>' : ''), n(eurS(dv.D2_valorisation_eur))],
        ['<b>D3</b> coûts omis', Object.keys(d3).map(function (k) { return esc(k) + ' ' + eurS(+d3[k]); }).join(' · '), n(eurS(dv.D3_couts_omis_eur))],
        ['<b>D4</b> arithmétique', 'résidu : tout ce que D1 à D3 n’expliquent pas', n(eurS(dv.D4_arithmetique_eur))],
        ['<b>Divergence totale</b>', 'capitaux déclarés − capitaux mesurés, nets d’impôt', n('<b>' + eurS(dv.divergence_eur) + '</b>')]
      ]));
    }
  }
  function n(x) { return { n: true, html: x }; }
  function table(entetes, lignes) {
    var h = '<div class="tableau"><table><thead><tr>' + entetes.map(function (e, i) {
      return '<th' + (i > 0 && /€|%|pb|×|^n$|Valeur|Mesuré|Déclaré|Rendement|Volatilité|Perte|Sharpe|Bêta/.test(e) ? ' class="n"' : '') + '>' + e + '</th>';
    }).join('') + '</tr></thead><tbody>';
    lignes.forEach(function (l) {
      if (l.groupe) { h += '<tr class="groupe"><td colspan="' + entetes.length + '">' + l.groupe + '</td></tr>'; return; }
      h += '<tr>' + l.map(function (c) {
        return (c && c.n) ? '<td class="n">' + c.html + '</td>' : '<td>' + (c === undefined || c === null ? '—' : c) + '</td>';
      }).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }

  var modePerf = 'indice';
  function figPerf(D) {
    var s = D.series;
    if (!s.dates.length) { attente('fig-perf'); return; }
    var ds = [{ label: 'Trader, mesuré, net de frais', data: base100(s.mesure), borderColor: C.mesure, borderWidth: 2.5 }];
    var leg = [{ nom: 'Trader (mesuré, net de frais)', couleur: C.mesure }];
    if (modePerf === 'indice') {
      ds.push({ label: 'Trader, net de frais et d’impôt', data: base100(s.mesure_liquidatif_net), borderColor: C.mesure, borderDash: [2, 3] });
      ds.push({ label: 'MSCI World (IWDA)', data: base100(s.iwda), borderColor: C.indice });
      ds.push({ label: 'Livret A', data: base100(s.livret_a), borderColor: C.neutre, borderDash: [6, 3], borderWidth: 1.5 });
      leg.push({ nom: 'Trader (net de frais et d’impôt)', couleur: C.mesure, tirets: true },
        { nom: 'MSCI World (IWDA)', couleur: C.indice }, { nom: 'Livret A', couleur: C.neutre, tirets: true });
    } else {
      ds.push({ label: 'MSCI World (IWDA)', data: base100(s.iwda), borderColor: C.indice, borderWidth: 1.5 });
      leg.push({ nom: 'MSCI World (IWDA)', couleur: C.indice });
      var couleurs = [C.s4, C.s5, C.s7, C.s6, C.s8];
      Object.keys(s.investisseurs || {}).forEach(function (tk, i) {
        var v = s.investisseurs[tk];
        ds.push({ label: v.nom, data: base100(v.valeurs), borderColor: couleurs[i % couleurs.length], borderWidth: 1.5 });
        leg.push({ nom: v.nom + ' · ' + v.vehicule.split(',')[0], couleur: couleurs[i % couleurs.length] });
      });
    }
    legende('leg-perf', leg);
    tracer('fig-perf', {
      type: 'line', data: { labels: libelles(s.dates), datasets: ds },
      options: { scales: axes(function (v) { return dec(v, 0); }), plugins: { legend: { display: false },
        tooltip: { callbacks: { label: function (c) { return c.dataset.label + ' : ' + dec(c.parsed.y, 1); } } } } }
    });
  }

  function tabProfils(D) {
    var ordre = ['mesure_brut', 'mesure', 'mesure_liquidatif_net', 'declare', 'iwda', 'iwda_liquidatif_net', 'livret_a'];
    Object.keys(D.profils || {}).forEach(function (k) { if (k.indexOf('inv_') === 0) ordre.push(k); });
    var lignes = [];
    ordre.forEach(function (k, i) {
      var p = D.profils[k];
      if (!p) return;
      if (i === 0) lignes.push({ groupe: 'Le trader' });
      if (k === 'iwda') lignes.push({ groupe: 'Références pré-enregistrées' });
      if (k.indexOf('inv_') === 0 && !lignes.some(function (l) { return l.groupe && /Investisseurs/.test(l.groupe); }))
        lignes.push({ groupe: 'Investisseurs connus, véhicules cotés <span class="etiq">exploratoire</span>' });
      lignes.push([esc(p.libelle) + (p.statut === 'piece' ? ' <span class="etiq">déclaré</span>' : ''),
        n(pct(p.rendement_pct, true)), n(pct(p.volatilite_pct)), n(pct(p.perte_max_pct)), n(dec(p.sharpe, 2)), n(dec(p.beta, 2))]);
    });
    fixer('tab-profils', lignes.length ? table(['', 'Rendement', 'Volatilité ann.', 'Perte max.', 'Sharpe', 'Bêta (IWDA)'], lignes)
      : '<p class="muet">Le tableau se remplira avec les premières séances mesurées.</p>');
  }

  var modeCompo = 'lignes';
  function empile(id, legId, series, dates) {
    var tot = dates.map(function (_, i) { return series.reduce(function (a, s) { return a + (s.valeurs[i] || 0); }, 0); });
    var ds = series.map(function (s, i) {
      var coul = s.cle === 'autres' || s.cle === 'non déclarée' ? C.neutre : ORDRE[i % ORDRE.length];
      return { label: s.cle, data: s.valeurs.map(function (v, j) { return tot[j] ? 100 * (v || 0) / tot[j] : null; }),
        borderColor: '#fff', borderWidth: 1, backgroundColor: coul, fill: true, pointRadius: 0 };
    });
    legende(legId, ds.map(function (d) { return { nom: d.label, couleur: d.backgroundColor }; }));
    tracer(id, { type: 'line', data: { labels: libelles(dates), datasets: ds },
      options: { scales: axes(function (v) { return v + ' %'; }, true, { y: { stacked: true, min: 0, max: 100, grid: { color: C.grille },
        border: { display: false }, ticks: { color: C.texte, font: { size: 11 }, callback: function (v) { return v + ' %'; } } } }),
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return c.dataset.label + ' : ' + pct(c.parsed.y); } } } } } });
  }
  function figCompo(D) {
    var c = D.composition, s = D.series;
    if (!c || !s.dates.length) { attente('fig-compo'); attente('fig-strat'); return; }
    empile('fig-compo', 'leg-compo', c[modeCompo] || [], s.dates);
    var noms = D.strategies || {};
    empile('fig-strat', 'leg-strat', (c.strategies || []).map(function (x) { return { cle: x.cle, valeurs: x.valeurs }; }), s.dates);
    var lignes = (c.dernier_jour || []).map(function (p) {
      return ['<b>' + esc(p.ticker) + '</b> <span class="muet">' + esc(p.instrument || '') + (p.sens === 'short' ? ' · vendeur' : '') + '</span>',
        p.strategie ? esc(p.strategie) + (noms[p.strategie] ? ' <span class="muet">— ' + esc(noms[p.strategie]) + '</span>' : '') : '<span class="muet">non déclarée</span>',
        n(eur(p.valeur_eur)), n(pct(p.poids_pct)), n(eurS(p.pv_latente_eur))];
    });
    fixer('tab-compo', lignes.length ? table(['Ligne', 'Stratégie déclarée', 'Valeur', 'Poids', 'Plus-value latente'], lignes) : '');
  }

  function figRisque(D) {
    var s = D.series;
    if (!s.dates.length) { attente('fig-levier'); attente('fig-conc'); return; }
    tracer('fig-levier', { type: 'line', data: { labels: libelles(s.dates), datasets: [
      { label: 'Levier brut', data: s.levier_brut, borderColor: C.mesure }] },
      options: { scales: axes(function (v) { return dec(v, 1) + '×'; }), plugins: { legend: { display: false },
        tooltip: { callbacks: { label: function (c) { return 'Levier brut : ' + dec(c.parsed.y, 2) + '×'; } } } } } });
    tracer('fig-conc', { type: 'line', data: { labels: libelles(s.dates), datasets: [
      { label: 'Poids de la première ligne', data: s.poids_premiere_ligne_pct, borderColor: C.mesure }] },
      options: { scales: axes(function (v) { return v + ' %'; }), plugins: { legend: { display: false },
        tooltip: { callbacks: { label: function (c) { return 'Première ligne : ' + pct(c.parsed.y); } } } } } });
  }

  function tabIndicateurs(D) {
    var m = D.profils.mesure || {}, b = D.profils.mesure_brut || {}, l = D.profils.mesure_liquidatif_net || {},
      d = D.profils.declare || {}, i = D.profils.iwda || {}, k = D.concentration || {};
    var P = '<span class="etiq">pré-enregistré</span>', X = '<span class="etiq">exploratoire</span>';
    var L = [
      { groupe: 'Rendement' },
      ['Rendement brut, avant frais et impôt ' + P, n(pct(b.rendement_pct, true)), n('—'), n(pct(i.rendement_pct, true))],
      ['Rendement net de frais ' + P, n(pct(m.rendement_pct, true)), n(pct(d.rendement_pct, true)), n(pct(i.rendement_pct, true))],
      ['Rendement net de frais et d’impôt, si tout était vendu ' + P, n(pct(l.rendement_pct, true)), n('—'), n(pct((D.profils.iwda_liquidatif_net || {}).rendement_pct, true))],
      ['Rendement annualisé (à partir de 3 mois)', n(pct(m.rendement_annualise_pct, true)), n(pct(d.rendement_annualise_pct, true)), n(pct(i.rendement_annualise_pct, true))],
      { groupe: 'Risque' },
      ['Volatilité annualisée ' + P, n(pct(m.volatilite_pct)), n(pct(d.volatilite_pct)), n(pct(i.volatilite_pct))],
      ['Perte maximale ' + P, n(pct(m.perte_max_pct)), n(pct(d.perte_max_pct)), n(pct(i.perte_max_pct))],
      ['Pire jour sur vingt (VaR 95 % historique, 1 jour) ' + X, n(pct(m.var95_jour_pct)), n(pct(d.var95_jour_pct)), n(pct(i.var95_jour_pct))],
      ['Bêta contre le MSCI World ' + X, n(dec(m.beta, 2)), n(dec(d.beta, 2)), n('1,00')],
      ['Erreur de suivi annualisée ' + X, n(pct(m.tracking_error_pct)), n(pct(d.tracking_error_pct)), n('—')],
      { groupe: 'Rendement ajusté du risque' },
      ['Ratio de Sharpe (taux sans risque : Livret A) ' + P, n(dec(m.sharpe, 2)), n(dec(d.sharpe, 2)), n(dec(i.sharpe, 2))],
      ['Ratio de Sortino ' + X, n(dec(m.sortino, 2)), n(dec(d.sortino, 2)), n(dec(i.sortino, 2))],
      ['Ratio de Calmar ' + X, n(dec(m.calmar, 2)), n(dec(d.calmar, 2)), n(dec(i.calmar, 2))],
      ['Alpha de Jensen annualisé ' + X, n(pct(m.alpha_pct, true)), n(pct(d.alpha_pct, true)), n('—')],
      ['Ratio d’information ' + X, n(dec(m.ratio_information, 2)), n(dec(d.ratio_information, 2)), n('—')],
      { groupe: 'Concentration et levier' },
      ['Nombre de lignes', n(dec(k.nb_lignes, 0)), n('—'), n('~1 400')],
      ['Nombre effectif de lignes (1/Herfindahl) ' + X, n(dec(k.nb_effectif_lignes, 1)), n('—'), n('—')],
      ['Herfindahl du carnet (B3) ' + P, n(dec(k.hhi, 3)), n('—'), n('—')],
      ['Poids de la première ligne (B3) ' + P, n(pct(k.poids_premiere_ligne_pct)), n('—'), n('~5 %')],
      ['Levier brut, actuel / maximal (B7) ' + P, n(vide(k.levier_brut) ? '—' : dec(k.levier_brut, 2) + '× / ' + dec(k.levier_brut_max, 2) + '×'), n('—'), n('1,00×')],
      ['Appels de marge (B12) ' + P, n(dec(k.appels_de_marge, 0)), n('—'), n('—')]
    ];
    fixer('tab-indicateurs', table(['Mesure', 'Mesuré', 'Déclaré', 'MSCI World'], L));
  }

  function figCouts(D) {
    var c = D.couts;
    if (!c) { attente('fig-couts'); fixer('tab-couts', ''); return; }
    var postes = c.postes;
    legende('leg-couts', [{ nom: 'Mesuré indépendamment', couleur: C.mesure }, { nom: 'Déclaré par le trader', couleur: C.declare }]);
    tracer('fig-couts', { type: 'bar', data: { labels: postes.map(function (p) { return p.poste; }), datasets: [
      { label: 'Mesuré indépendamment', data: postes.map(function (p) { return p.mesure_eur; }), backgroundColor: C.mesure, borderRadius: 4, barPercentage: 0.8 },
      { label: 'Déclaré par le trader', data: postes.map(function (p) { return p.declare_eur; }), backgroundColor: C.declare, borderRadius: 4, barPercentage: 0.8 }] },
      options: { indexAxis: 'y', interaction: { mode: 'index', intersect: false, axis: 'y' },
        scales: { x: { grid: { color: C.grille }, border: { display: false }, ticks: { color: C.texte, callback: function (v) { return nf0.format(v) + ' €'; } } },
          y: { grid: { display: false }, ticks: { color: C.texte, font: { size: 11 } } } },
        plugins: { legend: { display: false }, tooltip: tooltipEur() } } });
    fixer('tab-couts', table(['Poste', 'Mesuré', 'Déclaré', 'Points de rendement'], postes.map(function (p) {
      return [esc(p.poste), n(eur(p.mesure_eur)), n(p.declare_eur === null ? '<span class="muet">' + (p.poste === 'glissement' ? 'dans ses prix supposés' : 'non tenu') + '</span>' : eur(p.declare_eur)), n(dec(p.points_de_rendement, 3))];
    }).concat([['<b>Total</b>', n('<b>' + eur(c.total_mesure_eur) + '</b>'), n('—'), n('<b>' + dec(c.total_points, 3) + '</b>')],
      ['dont liquidations forcées', n(eur(c.dont_liquidations_forcees_eur)), n('—'), n('—')]])));
  }

  function tabComportement(D) {
    var a = D.activite || {};
    var L = [
      ['Fenêtres de décision tenues', n(dec(a.fenetres_avec_decision, 0)), 'dont ' + dec(a.fenetres_sans_ordre, 0) + ' sans ordre'],
      ['Ordres transmis', n(dec(a.ordres, 0)), dec(a.ordres_executes, 0) + ' exécutés · ' + dec(a.ordres_non_executes, 0) + ' non exécutés'],
      ['Notionnel échangé', n(eur(a.notionnel_echange_eur)), 'base de la rotation (B1)'],
      ['Ordres appuyés sur un fait daté', n(pct(a.faits_cites_pct)), 'B6, première proportion']
    ];
    (D.comportement || []).forEach(function (m) {
      L.push(['<code>' + esc(m.indicateur) + '</code>', n(vide(m.valeur) || m.valeur === '' ? '—' : esc(m.valeur)), esc(m.note) + (m.n ? ' <span class="muet">(n = ' + esc(m.n) + ')</span>' : '')]);
    });
    fixer('tab-comportement', table(['Indicateur', 'Valeur', 'Lecture'], L));
  }

  function verificateur(D) {
    var v = D.verificateur || {};
    fixer('tab-verificateur', (v.controles || []).length ? table(['Contrôle', 'État', 'Détail'], v.controles.map(function (c) {
      return [c.id + ' · ' + esc(c.titre), c.etat === 'ok' ? '<span class="pastille ok">passe</span>' : c.etat === 'echec' ? '<span class="pastille echec">échec</span>' : 'sans objet', esc(c.detail)];
    })) : '<p class="muet">Verdict non disponible.</p>');
  }

  function rapport(D) {
    enTete(D); tuiles(D); figAuto(D); figPerf(D); tabProfils(D); figCompo(D); figRisque(D);
    tabIndicateurs(D); figCouts(D); tabComportement(D); verificateur(D);
    boutons('cmd-perf', function (m) { modePerf = m; figPerf(D); });
    boutons('cmd-compo', function (m) { modeCompo = m; figCompo(D); });
  }
  function boutons(id, rappel) {
    var el = $(id);
    if (!el) return;
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      el.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      rappel(b.getAttribute('data-mode'));
    });
  }

  // ------------------------------------------------------------------ registre des décisions
  var ACHAT = { ouvrir: 1, renforcer: 1 };
  function registre(D) {
    var toutes = D.decisions || [];
    var ordres = toutes.filter(function (d) { return d.action !== 'aucune'; });
    var strat = {};
    ordres.forEach(function (d) { if (d.strategie) strat[d.strategie] = (strat[d.strategie] || 0) + 1; });
    fixer('decisions-chiffres', '<b>' + toutes.length + '</b> fenêtres consignées · <b>' + ordres.length + '</b> ordres · <b>' +
      (toutes.length - ordres.length) + '</b> fenêtres sans ordre' + (D.arret_des_donnees ? ' · données arrêtées au ' + dateFr(D.arret_des_donnees) : ''));
    var sel = $('filtre-strategie');
    if (sel) {
      Object.keys(strat).sort().forEach(function (s) {
        var o = document.createElement('option'); o.value = s; o.textContent = s + ' (' + strat[s] + ')'; sel.appendChild(o);
      });
    }
    var tick = $('filtre-ticker'), vides = $('filtre-vides'), act = $('filtre-action');
    function rendre() {
      var fs = sel ? sel.value : '', ft = tick ? tick.value.trim().toUpperCase() : '', fv = vides && vides.checked, fa = act ? act.value : '';
      var liste = toutes.filter(function (d) {
        if (d.action === 'aucune') return fv && !fs && !ft && !fa;
        if (fs && d.strategie !== fs) return false;
        if (fa && d.action !== fa) return false;
        if (ft && (d.ticker || '').toUpperCase().indexOf(ft) < 0) return false;
        return true;
      }).slice().reverse();
      fixer('decisions-compte', liste.length + ' entrée' + (liste.length > 1 ? 's' : '') + ' affichée' + (liste.length > 1 ? 's' : ''));
      if (!toutes.length) { fixer('decisions-liste', '<div class="encadre">Aucune décision encore. ' + esc(ATTENTE) + '</div>'); return; }
      var h = '', jourCourant = null;
      liste.forEach(function (d) {
        if (d.date !== jourCourant) {
          if (jourCourant) h += '</div>';
          jourCourant = d.date; h += '<div class="jour"><h3>' + dateFr(d.date) + '</h3>';
        }
        h += carte(d, D.strategies || {});
      });
      if (jourCourant) h += '</div>';
      fixer('decisions-liste', h || '<p class="muet">Aucune entrée ne correspond aux filtres.</p>');
    }
    [sel, tick, vides, act].forEach(function (el) { if (el) el.addEventListener('input', rendre); });
    rendre();
  }
  function carte(d, noms) {
    var fen = d.fenetre ? d.fenetre.slice(0, 2) + 'h' + d.fenetre.slice(2) + ' UTC' : '';
    var j = d.journal ? ' · <a href="' + esc(d.journal) + '" target="_blank" rel="noopener">raisonnement complet</a>' : '';
    if (d.action === 'aucune') {
      return '<div class="decision vide"><div class="details"><span>' + fen + ' · aucune opération</span></div>' +
        '<p class="motif">' + esc(d.raison) + '</p></div>';
    }
    var vente = !ACHAT[d.action] !== (d.sens === 'short');
    var e = d.execution || {};
    var exe = e.statut === 'execute'
      ? 'exécuté le ' + dateFr(e.date) + ' à ' + dec(e.prix, 2) + ' ' + esc(d.devise || '') + ' · ' + eur(e.montant_eur) +
        ' · frais ' + eur(e.couts_eur) + (vide(e.ecart_prix_suppose_pct) ? '' : ' · prix supposé par le trader ' + pct(-e.ecart_prix_suppose_pct, true) + ' du prix servi')
      : e.statut ? 'non exécuté — ' + esc(e.motif) : 'pas encore mesuré';
    return '<div class="decision"><div class="tete">' +
      '<span class="action ' + (vente ? 'vente' : 'achat') + '">' + esc(d.action) + (d.sens === 'short' ? ' · vendeur' : '') + '</span>' +
      '<b>' + esc(d.ticker) + '</b><span class="muet">' + dec(d.quantite, 0) + ' × ' + esc(d.instrument) + ' · ' + esc(d.place) + '</span>' +
      (d.strategie ? '<span class="etiq" title="' + esc(noms[d.strategie] || '') + '">' + esc(d.strategie) + '</span>' : '') + '</div>' +
      '<p class="motif">' + esc(d.raison) + '</p>' +
      '<div class="details"><span>' + fen + '</span><span>horizon annoncé ' + dec(d.horizon_j, 0) + ' j</span><span>' + esc(d.type_ordre || '') +
      (vide(d.limite) ? '' : ' ' + dec(d.limite, 2)) + '</span>' +
      (d.fait && d.fait !== '-' ? '<span>fait invoqué : ' + esc(d.fait) + (d.source ? ' (' + esc(d.source) + ')' : '') + '</span>' : '<span>aucun fait invoqué</span>') +
      '</div><div class="details"><span>Mesure : ' + exe + j + '</span></div></div>';
  }


  // ------------------------------------------------------------------ page « Calculs »
  function uniteFmt(u, v) {
    if (vide(v)) return '—';
    if (u === 'eur') return eur(v);
    if (u === 'pct') return pct(v);
    if (u === 'x') return dec(v, 2) + '×';
    if (u === 'j') return dec(v, 1) + ' j';
    if (u === 'n') return dec(v, 0);
    return dec(v, 2);
  }
  function calculs(D) {
    var M = D.mesures || [];
    var nc = M.filter(function (m) { return vide(m.valeur); });
    fixer('mesures-bilan', '<b>' + M.length + '</b> mesures publiées · <b>' + (M.length - nc.length) + '</b> calculées à la date d’arrêt' +
      (D.arret_des_donnees ? ' (' + dateFr(D.arret_des_donnees) + ')' : '') + ' · <b>' + nc.length + '</b> non calculées' +
      (nc.length ? ' : ' + nc.map(function (m) { return esc(m.nom) + ' <span class="muet">(' + esc(m.raison) + ')</span>'; }).join(', ') : ''));
    var groupes = [];
    M.forEach(function (m) { if (groupes.indexOf(m.groupe) < 0) groupes.push(m.groupe); });
    fixer('mesures-sommaire', groupes.map(function (g, i) { return '<li><a href="#g' + i + '">' + esc(g) + '</a></li>'; }).join(''));
    var h = '';
    groupes.forEach(function (g, i) {
      h += '<section id="g' + i + '"><h2>' + esc(g) + '</h2>';
      M.filter(function (m) { return m.groupe === g; }).forEach(function (m) {
        h += '<div class="mesure" id="m-' + esc(m.id) + '"><div class="tete"><h3>' + esc(m.nom) + '</h3>' +
          '<span class="etiq">' + (m.statut === 'exploratoire' ? 'exploratoire' : 'pré-enregistré') + '</span>' +
          '<span class="valeur-mesure">' + uniteFmt(m.unite, m.valeur) + '</span></div>' +
          '<dl><dt>Définition</dt><dd>' + esc(m.litteral) + '</dd><dt>Calcul</dt><dd><code>' + esc(m.operationnel) + '</code></dd></dl>' +
          (m.serie ? '<div class="cadre petit" data-mesure="' + esc(m.id) + '"></div>'
            : '<p class="muet">Non calculée : ' + esc(m.raison || 'pas de série') + '.</p>') + '</div>';
      });
      h += '</section>';
    });
    fixer('mesures-liste', h);
    var parId = {};
    M.forEach(function (m) { parId[m.id] = m; });
    var obs = 'IntersectionObserver' in window ? new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) { obs.unobserve(e.target); petitGraphe(e.target, parId[e.target.getAttribute('data-mesure')]); } });
    }, { rootMargin: '200px' }) : null;
    document.querySelectorAll('[data-mesure]').forEach(function (el, i) {
      el.id = 'mg-' + i;
      if (obs) obs.observe(el); else petitGraphe(el, parId[el.getAttribute('data-mesure')]);
    });
  }
  function petitGraphe(el, m) {
    if (!m || !m.serie) return;
    var pts = m.serie.valeurs.filter(function (v) { return !vide(v); }).length;
    tracer(el.id, { type: pts === 1 ? 'bar' : 'line',
      data: { labels: libelles(m.serie.dates), datasets: [{ label: m.nom, data: m.serie.valeurs, borderColor: C.mesure,
        backgroundColor: C.mesure, borderWidth: 2, spanGaps: true, pointRadius: pts < 15 ? 3 : 0, maxBarThickness: 28 }] },
      options: { scales: axes(function (v) { return uniteFmt(m.unite, v); }), plugins: { legend: { display: false },
        tooltip: { callbacks: { label: function (c) { return uniteFmt(m.unite, c.parsed.y); } } } } } });
  }

  // ------------------------------------------------------------------ page « Données »
  function lireCsv(txt) {
    var lignes = [], champ = '', ligne = [], q = false;
    for (var i = 0; i < txt.length; i++) {
      var c = txt[i];
      if (q) {
        if (c === '"' && txt[i + 1] === '"') { champ += '"'; i++; } else if (c === '"') q = false; else champ += c;
      } else if (c === '"') q = true;
      else if (c === ',') { ligne.push(champ); champ = ''; }
      else if (c === '\n') { ligne.push(champ.replace(/\r$/, '')); lignes.push(ligne); ligne = []; champ = ''; }
      else champ += c;
    }
    if (champ || ligne.length) { ligne.push(champ); lignes.push(ligne); }
    return lignes.filter(function (l) { return l.some(function (x) { return x !== ''; }); });
  }
  function donnees(D) {
    var T = (D.tables || []).filter(function (t) { return t.present; });
    fixer('tables-liste', table(['Fichier', 'Écrit par', 'Contenu', 'Lignes'], T.map(function (t) {
      return ['<a href="#" data-table="' + esc(t.nom) + '"><code>' + esc(t.nom) + '</code></a>', esc(t.ecrit_par), esc(t.description), n(dec(t.lignes, 0))];
    })));
    var etat = { nom: null, entete: [], lignes: [], filtre: '', tri: -1, sens: 1, page: 0 };
    var PAGE = 50;
    function afficher() {
      var f = etat.filtre.toLowerCase();
      var L = etat.lignes.filter(function (l) { return !f || l.join(' ').toLowerCase().indexOf(f) >= 0; });
      if (etat.tri >= 0) {
        L = L.slice().sort(function (a, b) {
          var x = a[etat.tri] || '', y = b[etat.tri] || '', nx = Number(x), ny = Number(y);
          var r = (x !== '' && y !== '' && !isNaN(nx) && !isNaN(ny)) ? nx - ny : x.localeCompare(y);
          return r * etat.sens;
        });
      }
      var pages = Math.max(1, Math.ceil(L.length / PAGE));
      etat.page = Math.min(etat.page, pages - 1);
      var vue = L.slice(etat.page * PAGE, (etat.page + 1) * PAGE);
      var h = '<div class="tableau"><table class="brut"><thead><tr>' + etat.entete.map(function (c, i) {
        return '<th data-col="' + i + '">' + esc(c) + (etat.tri === i ? (etat.sens > 0 ? ' ▲' : ' ▼') : '') + '</th>';
      }).join('') + '</tr></thead><tbody>' + vue.map(function (l) {
        return '<tr>' + l.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
      fixer('table-vue', L.length ? h : '<p class="muet">Aucune ligne' + (f ? ' ne correspond au filtre' : ' : le fichier ne contient que son en-tête') + '.</p>');
      fixer('table-pages', L.length > PAGE ? '<button data-p="-1">←</button> page ' + (etat.page + 1) + ' / ' + pages + ' <button data-p="1">→</button>' : '');
      fixer('table-compte', L.length + ' ligne' + (L.length > 1 ? 's' : ''));
    }
    function ouvrir(nom) {
      var t = T.filter(function (x) { return x.nom === nom; })[0];
      etat.nom = nom; etat.filtre = ''; etat.tri = -1; etat.page = 0;
      $('table-filtre').value = '';
      fixer('table-titre', '<code>' + esc(nom) + '</code> <a href="trader-ia/donnees/' + esc(nom) + '" download>télécharger le CSV</a>');
      fixer('table-description', esc(t ? t.description : ''));
      $('table-panneau').hidden = false;
      fetch('trader-ia/donnees/' + nom, { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (txt) {
        var L = lireCsv(txt);
        etat.entete = L[0] || (t ? t.colonnes : []); etat.lignes = L.slice(1);
        afficher();
      });
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-table]');
      if (a) { e.preventDefault(); ouvrir(a.getAttribute('data-table')); $('table-panneau').scrollIntoView(); return; }
      var th = e.target.closest('th[data-col]');
      if (th && $('table-vue').contains(th)) {
        var c = +th.getAttribute('data-col');
        etat.sens = etat.tri === c ? -etat.sens : 1; etat.tri = c; afficher(); return;
      }
      var b = e.target.closest('#table-pages button');
      if (b) { etat.page = Math.max(0, etat.page + (+b.getAttribute('data-p'))); afficher(); }
    });
    $('table-filtre').addEventListener('input', function (e) { etat.filtre = e.target.value; etat.page = 0; afficher(); });
    if (T.length) ouvrir(T[0].nom);
  }

  // ------------------------------------------------------------------ chargement
  var racine = document.querySelector('[data-donnees]');
  if (!racine) return;
  fetch(racine.getAttribute('data-donnees'), { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (D) {
      if (D.schema !== 'trader-ia/1') throw new Error('schéma inattendu : ' + D.schema);
      if ($('decisions-liste')) registre(D);
      else if ($('mesures-liste')) calculs(D);
      else if ($('tables-liste')) donnees(D);
      else rapport(D);
    })
    .catch(function (e) {
      document.querySelectorAll('.cadre').forEach(function (el) { el.innerHTML = '<div class="attente">Données indisponibles (' + esc(e.message) + ').</div>'; });
    });
})();

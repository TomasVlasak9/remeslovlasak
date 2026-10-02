/* Načítání galerie realizací z API.
   Používá index.html (vybraných až 6 fotek) i /realizace/ (všechny). */
(function () {
  'use strict';

  /* Pojistka: základní realizace zůstanou vidět i při krátkém výpadku služby galerie. */
  var zalozniPolozky = [
    { soubor: 'images/realizace/Pergola.png', popisek: 'Zahradní pergola', alt: 'Zahradní pergola s ohništěm', sirka: 1080, vyska: 1080, naUvodu: true },
    { soubor: 'images/realizace/Kuchyn.png', popisek: 'Kuchyňská linka na míru', alt: 'Montáž kuchyňské linky', sirka: 1080, vyska: 1080, naUvodu: true },
    { soubor: 'images/realizace/zahrada.png', popisek: 'Úprava zahrady', alt: 'Úprava zahrady s posezením', sirka: 896, vyska: 1195, naUvodu: true }
  ];

  function urlFotky(polozka) {
    return polozka.soubor ? '/' + polozka.soubor : '/api/foto/' + polozka.id;
  }

  function vytvorDlazdici(polozka) {
    var wrap = document.createElement('div');
    wrap.className = 'gallery-item';
    wrap.dataset.img = urlFotky(polozka);
    wrap.dataset.caption = polozka.popisek || '';

    var img = document.createElement('img');
    img.src = urlFotky(polozka);
    img.alt = polozka.alt || polozka.popisek || 'Realizace';
    img.loading = 'lazy';
    if (polozka.sirka && polozka.vyska) {
      img.width = polozka.sirka;
      img.height = polozka.vyska;
    }
    wrap.appendChild(img);

    if (polozka.popisek) {
      var cap = document.createElement('div');
      cap.className = 'gallery-caption';
      cap.textContent = polozka.popisek;
      wrap.appendChild(cap);
    }
    return wrap;
  }

  function nacti(options) {
    var box = document.getElementById(options.cil);
    if (!box) return;

    fetch('/api/galerie', { headers: { 'Accept': 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('API ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var polozky = (data && data.polozky) || [];
        if (options.pouzeUvod) polozky = polozky.filter(function (p) { return p.naUvodu; });
        if (options.limit) polozky = polozky.slice(0, options.limit);

        if (!polozky.length) {
          // Radši sekci schovat než ukázat prázdno
          var sekce = box.closest('section');
          if (sekce) sekce.style.display = 'none';
          if (options.prazdno) {
            var p = document.getElementById(options.prazdno);
            if (p) p.hidden = false;
            if (sekce) sekce.style.display = '';
            box.hidden = true;
          }
          return;
        }

        box.innerHTML = '';
        polozky.forEach(function (polozka) {
          box.appendChild(vytvorDlazdici(polozka));
        });

        if (options.vice) {
          var btn = document.getElementById(options.vice);
          if (btn) btn.hidden = (data.celkem || polozky.length) <= options.limit;
        }
      })
      .catch(function () {
        // Při výpadku API se zobrazí základní fotky místo prázdné sekce.
        var polozky = options.pouzeUvod ? zalozniPolozky.filter(function (p) { return p.naUvodu; }) : zalozniPolozky;
        if (options.limit) polozky = polozky.slice(0, options.limit);
        box.innerHTML = '';
        polozky.forEach(function (polozka) { box.appendChild(vytvorDlazdici(polozka)); });
      });
  }

  window.NactiGalerii = nacti;
})();
